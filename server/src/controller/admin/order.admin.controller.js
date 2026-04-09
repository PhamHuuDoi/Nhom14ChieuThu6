const prisma = require('../../config/prisma');
const { NotFoundError, BadRequestError } = require('../../core/error.response');
const { OK } = require('../../core/success.response');
const {
    NOTIFICATION_TYPE,
    createUserOrderStatusNotification,
} = require('../../services/notification.service');
const {
    emitOrderStatusUpdated,
    emitUserNotificationCreated,
} = require('../../socket/socket');

const ORDER_SELECT = {
    id: true,
    coupon_id: true,
    order_code: true,
    discount_amount: true,
    shipping_fee: true,
    total_amount: true,
    shipping_address: true,
    note: true,
    order_status: true,
    payment_status: true,
    created_at: true,
    updated_at: true,
    user_id: true,
    users: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
    order_items: {
        select: {
            id: true,
            quantity: true,
            unit_price: true,
            subtotal: true,
            products: {
                select: {
                    id: true,
                    name: true,
                    sku: true,
                },
            },
        },
    },
    payments: {
        orderBy: { created_at: 'desc' },
        take: 1,
        select: {
            id: true,
            method: true,
            status: true,
            transaction_code: true,
            created_at: true,
            paid_at: true,
        },
    },
};

const INVENTORY_DEDUCTION_STATUSES = new Set(['shipping', 'completed']);
const ADMIN_ORDER_STATUS_FLOW = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['shipping'],
    shipping: [],
    completed: [],
    cancelled: [],
};

function buildInventoryExportNote(orderId) {
    return `Xuất kho nguyên liệu cho đơn hàng #${orderId}`;
}

function canAdminUpdateOrderStatus(currentStatus, nextStatus) {
    if (currentStatus === nextStatus) {
        return true;
    }

    const allowedNextStatuses = ADMIN_ORDER_STATUS_FLOW[currentStatus] || [];
    return allowedNextStatuses.includes(nextStatus);
}

async function getLatestPaymentByOrder(tx, orderId) {
    return tx.payments.findFirst({
        where: { order_id: orderId },
        orderBy: { created_at: 'desc' },
        select: {
            id: true,
            method: true,
            status: true,
            paid_at: true,
        },
    });
}

async function deductInventoryForOrder(tx, { orderId, adminId }) {
    const exportNote = buildInventoryExportNote(orderId);
    const existingExport = await tx.inventory_transactions.findFirst({
        where: {
            type: 'export',
            note: exportNote,
        },
        select: { id: true },
    });

    if (existingExport) {
        return false;
    }

    const orderItems = await tx.order_items.findMany({
        where: { order_id: orderId },
        select: {
            id: true,
            quantity: true,
            products: {
                select: {
                    id: true,
                    name: true,
                    recipes: {
                        select: {
                            inventory_id: true,
                            quantity_used: true,
                        },
                    },
                },
            },
        },
    });

    if (!orderItems.length) {
        throw new BadRequestError('Không tìm thấy sản phẩm trong đơn hàng để trừ kho nguyên liệu');
    }

    const missingRecipeProducts = [];
    const inventoryUsageMap = new Map();

    for (const item of orderItems) {
        const recipes = item.products?.recipes || [];

        if (!recipes.length) {
            missingRecipeProducts.push(item.products?.name || `Sản phẩm #${item.products?.id || item.id}`);
            continue;
        }

        for (const recipe of recipes) {
            const inventoryId = Number(recipe.inventory_id);
            const requiredQuantity = Number(recipe.quantity_used || 0) * Number(item.quantity || 0);
            const currentUsage = inventoryUsageMap.get(inventoryId) || 0;
            inventoryUsageMap.set(inventoryId, currentUsage + requiredQuantity);
        }
    }

    if (missingRecipeProducts.length > 0) {
        throw new BadRequestError(
            `Không thể chuyển trạng thái vì các sản phẩm chưa có công thức: ${missingRecipeProducts.join(', ')}`
        );
    }

    const inventoryIds = [...inventoryUsageMap.keys()];

    if (inventoryIds.length === 0) {
        throw new BadRequestError('Không có nguyên liệu nào cần xuất kho cho đơn hàng này');
    }

    const inventoryItems = await tx.inventory.findMany({
        where: {
            id: { in: inventoryIds },
        },
        select: {
            id: true,
            name: true,
            quantity: true,
            unit: true,
        },
    });

    if (inventoryItems.length !== inventoryIds.length) {
        throw new NotFoundError('Có nguyên liệu trong công thức không còn tồn tại trong kho');
    }

    const insufficientItems = inventoryItems
        .map((item) => {
            const requiredQuantity = inventoryUsageMap.get(item.id) || 0;
            const currentQuantity = Number(item.quantity || 0);

            if (currentQuantity >= requiredQuantity) {
                return null;
            }

            return `${item.name} (${currentQuantity}/${requiredQuantity} ${item.unit})`;
        })
        .filter(Boolean);

    if (insufficientItems.length > 0) {
        throw new BadRequestError(`Không đủ nguyên liệu trong kho: ${insufficientItems.join(', ')}`);
    }

    for (const item of inventoryItems) {
        const exportQuantity = inventoryUsageMap.get(item.id) || 0;
        const remainingQuantity = Number(item.quantity || 0) - exportQuantity;

        await tx.inventory.update({
            where: { id: item.id },
            data: {
                quantity: remainingQuantity,
                status: remainingQuantity <= 0 ? 'out_of_stock' : 'available',
                updated_at: new Date(),
            },
        });
    }

    await tx.inventory_transactions.createMany({
        data: inventoryItems.map((item) => ({
            inventory_id: item.id,
            type: 'export',
            quantity: inventoryUsageMap.get(item.id) || 0,
            note: exportNote,
            created_by: adminId || null,
        })),
    });

    return true;
}

function normalizeOrder(order) {
    if (!order) {
        return order;
    }

    return {
        ...order,
        user: order.users,
        payment: order.payments?.[0] || null,
        payment_method: order.payments?.[0]?.method || null,
        discount_amount: Number(order.discount_amount || 0),
        shipping_fee: Number(order.shipping_fee || 0),
        total_amount: Number(order.total_amount || 0),
    };
}

class OrderController {
    async getOrders(req, res) {
        const orders = await prisma.orders.findMany({
            orderBy: { created_at: 'desc' },
            select: ORDER_SELECT,
        });

        new OK({
            message: 'Lấy danh sách đơn hàng thành công',
            metadata: orders.map(normalizeOrder),
        }).send(res);
    }

    async updateOrderStatus(req, res) {
        const orderId = Number(req.params.id);
        const { status } = req.body;
        const adminId = Number(req.user?.userId || req.user?.id);

        if (Number.isNaN(orderId)) {
            throw new BadRequestError('ID đơn hàng không hợp lệ');
        }

        const order = await prisma.orders.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundError('Đơn hàng không tồn tại');
        }

        if (!canAdminUpdateOrderStatus(order.order_status, status)) {
            throw new BadRequestError('Admin không thể chuyển đơn hàng sang trạng thái này');
        }

        if (status === 'completed') {
            throw new BadRequestError('Chỉ người dùng mới có thể xác nhận đã nhận hàng để hoàn thành đơn');
        }

        const updateResult = await prisma.$transaction(async (tx) => {
            const latestPayment = await getLatestPaymentByOrder(tx, orderId);
            const isCodOrder = latestPayment?.method === 'cash' || order.payment_method === 'cash';
            const canProcessOrder = order.payment_status === 'paid' || isCodOrder;
            let userNotification = null;

            if (['preparing', 'shipping', 'completed'].includes(status) && !canProcessOrder) {
                throw new BadRequestError('Chỉ có thể xử lý đơn sau khi đơn hàng đã được thanh toán hoặc là đơn COD.');
            }

            const shouldDeductInventory =
                canProcessOrder &&
                !INVENTORY_DEDUCTION_STATUSES.has(order.order_status) &&
                INVENTORY_DEDUCTION_STATUSES.has(status);

            if (shouldDeductInventory) {
                await deductInventoryForOrder(tx, { orderId, adminId });
            }

            if (status === 'confirmed') {
                await tx.notifications.updateMany({
                    where: {
                        audience: 'admin',
                        order_id: orderId,
                        type: NOTIFICATION_TYPE.ORDER_PENDING_CONFIRMATION,
                        is_read: false,
                    },
                    data: {
                        is_read: true,
                        read_at: new Date(),
                        updated_at: new Date(),
                    },
                });
            }

            if (['confirmed', 'preparing', 'shipping', 'cancelled'].includes(status)) {
                userNotification = await createUserOrderStatusNotification(
                    {
                        userId: order.user_id,
                        orderId: order.id,
                        orderCode: order.order_code,
                        status,
                    },
                    tx
                );
            }

            const updatedOrder = await tx.orders.update({
                where: { id: orderId },
                data: {
                    order_status: status,
                    updated_at: new Date(),
                },
                select: ORDER_SELECT,
            });

            return {
                updatedOrder,
                userNotification,
            };
        });

        const normalizedOrder = normalizeOrder(updateResult.updatedOrder);

        emitOrderStatusUpdated({
            ...normalizedOrder,
            user_id: order.user_id,
        });

        if (updateResult.userNotification && order.user_id) {
            emitUserNotificationCreated(order.user_id, updateResult.userNotification);
        }

        new OK({
            message: 'Cập nhật trạng thái đơn hàng thành công',
            metadata: normalizedOrder,
        }).send(res);
    }

    async updatePaymentStatus(req, res) {
        const orderId = Number(req.params.id);
        const { paymentStatus } = req.body;
        const adminId = Number(req.user?.userId || req.user?.id);

        if (Number.isNaN(orderId)) {
            throw new BadRequestError('ID đơn hàng không hợp lệ');
        }

        const order = await prisma.orders.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundError('Đơn hàng không tồn tại');
        }

        if (order.order_status === 'cancelled') {
            throw new BadRequestError('Kh?ng th? c?p nh?t thanh to?n cho ??n h?ng ?? h?y');
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            await tx.orders.update({
                where: { id: orderId },
                data: {
                    payment_status: paymentStatus,
                    order_status: order.order_status,
                    updated_at: new Date(),
                },
            });

            const latestPayment = await tx.payments.findFirst({
                where: { order_id: orderId },
                orderBy: { created_at: 'desc' },
            });

            const isCodOrder = latestPayment?.method === 'cash' || order.payment_method === 'cash';

            if (latestPayment) {
                const paymentRecordStatus =
                    paymentStatus === 'paid'
                        ? 'success'
                        : paymentStatus === 'failed'
                          ? 'failed'
                          : paymentStatus === 'refunded'
                            ? 'refunded'
                            : 'pending';

                await tx.payments.update({
                    where: { id: latestPayment.id },
                    data: {
                        status: paymentRecordStatus,
                        paid_at: paymentStatus === 'paid' ? latestPayment.paid_at || new Date() : null,
                    },
                });
            }

            if ((paymentStatus === 'paid' || isCodOrder) && INVENTORY_DEDUCTION_STATUSES.has(order.order_status)) {
                await deductInventoryForOrder(tx, { orderId, adminId });
            }

            return tx.orders.findUnique({
                where: { id: orderId },
                select: ORDER_SELECT,
            });
        });

        new OK({
            message: 'Cập nhật trạng thái thanh toán thành công',
            metadata: normalizeOrder(updatedOrder),
        }).send(res);
    }
}

module.exports = new OrderController();
