const prisma = require('../../config/prisma');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../../core/error.response');
const { OK, Created } = require('../../core/success.response');
const { PAYMENT_METHOD_MAP, createTransactionCode } = require('../../services/payment.service');
const { getDistanceShippingQuote } = require('../../services/distance-shipping.service');
const { createAdminOrderPendingNotification } = require('../../services/notification.service');
const { emitAdminNotificationCreated, emitNewOrderToAdmins, emitOrderStatusUpdated } = require('../../socket/socket');
const { findCouponByCode, validateCouponAvailability, calculateDiscount } = require('./coupon.user.controller');

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
        },
    },
};

const CANCELLABLE_STATUSES = ['pending', 'confirmed'];

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

function buildShippingAddress(shippingInfo) {
    return [
        shippingInfo.fullName?.trim(),
        shippingInfo.phone?.trim(),
        shippingInfo.email?.trim(),
        shippingInfo.address?.trim(),
    ]
        .filter(Boolean)
        .join(' | ');
}

function resolveShippingCoordinates(currentUser, shippingInfo) {
    const latitude =
        shippingInfo.latitude !== null &&
        shippingInfo.latitude !== undefined &&
        !Number.isNaN(Number(shippingInfo.latitude))
            ? Number(shippingInfo.latitude)
            : currentUser.latitude !== null &&
                currentUser.latitude !== undefined &&
                !Number.isNaN(Number(currentUser.latitude))
              ? Number(currentUser.latitude)
              : null;

    const longitude =
        shippingInfo.longitude !== null &&
        shippingInfo.longitude !== undefined &&
        !Number.isNaN(Number(shippingInfo.longitude))
            ? Number(shippingInfo.longitude)
            : currentUser.longitude !== null &&
                currentUser.longitude !== undefined &&
                !Number.isNaN(Number(currentUser.longitude))
              ? Number(currentUser.longitude)
              : null;

    return { latitude, longitude };
}

function createOrderCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomSuffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `ZOO-${timestamp}-${randomSuffix}`;
}

class OrderController {
    async checkout(req, res) {
        const userId = Number(req.user?.userId || req.user?.id);
        const { shippingInfo, paymentMethod, items, couponCode } = req.body;

        if (!userId) {
            throw new BadRequestError('Không xác định được người dùng đặt hàng');
        }

        if (!shippingInfo || typeof shippingInfo !== 'object') {
            throw new BadRequestError('Thông tin giao hàng không hợp lệ');
        }

        const currentUser = await prisma.users.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                latitude: true,
                longitude: true,
            },
        });

        if (!currentUser) {
            throw new NotFoundError('Người dùng không tồn tại');
        }


        if (
            !shippingInfo.fullName?.trim() ||
            !shippingInfo.phone?.trim() ||
            !shippingInfo.email?.trim() ||
            !shippingInfo.address?.trim()
        ) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin giao hàng');
        }


        const shippingCoordinates = resolveShippingCoordinates(currentUser, shippingInfo);

        if (shippingCoordinates.latitude === null || shippingCoordinates.longitude === null) {
            throw new BadRequestError('Vui l?ng ch?n ??a ch? giao h?ng c? t?a ?? h?p l? tr??c khi thanh to?n');
        }
        if (!paymentMethod || !PAYMENT_METHOD_MAP[paymentMethod]) {
            throw new BadRequestError('Phương thức thanh toán không hợp lệ');
        }

        if (!Array.isArray(items) || items.length === 0) {
            throw new BadRequestError('Đơn hàng phải có ít nhất một sản phẩm');
        }

        const productIds = [...new Set(items.map((item) => Number(item.productId)).filter((id) => !Number.isNaN(id)))];

        if (productIds.length === 0) {
            throw new BadRequestError('Danh sách sản phẩm không hợp lệ');
        }

        const products = await prisma.products.findMany({
            where: {
                id: { in: productIds },
                status: 'available',
                categories: {
                    is: {
                        status: 'active',
                    },
                },
            },
            select: {
                id: true,
                name: true,
                price: true,
                status: true,
            },
        });

        if (products.length !== productIds.length) {
            throw new NotFoundError('Một hoặc nhiều sản phẩm không tồn tại hoặc đã ngừng bán');
        }

        const productMap = new Map(products.map((product) => [product.id, product]));

        const normalizedItems = items.map((item) => {
            const productId = Number(item.productId);
            const quantity = Number(item.quantity);
            const product = productMap.get(productId);

            if (!product || Number.isNaN(quantity) || quantity <= 0) {
                throw new BadRequestError('Thông tin sản phẩm trong đơn hàng không hợp lệ');
            }

            const unitPrice = Number(product.price);

            return {
                productId,
                quantity,
                unitPrice,
                subtotal: unitPrice * quantity,
            };
        });

        const subtotal = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
        let coupon = null;
        let discountAmount = 0;

        if (couponCode?.trim()) {
            coupon = await findCouponByCode(couponCode);
            validateCouponAvailability(coupon);
            discountAmount = calculateDiscount(coupon, subtotal);
        }

        const shippingQuote = await getDistanceShippingQuote({
            customerLatitude: shippingCoordinates.latitude,
            customerLongitude: shippingCoordinates.longitude,
        });

        const shippingFee = Number(shippingQuote.shippingFee || 0);
        const totalAmount = Math.max(0, subtotal - discountAmount) + shippingFee;

        const orderResult = await prisma.$transaction(async (tx) => {
            const orderCode = createOrderCode();
            const paymentTransactionCode = paymentMethod === 'cod' ? null : createTransactionCode(paymentMethod, orderCode);

            const createdOrder = await tx.orders.create({
                data: {
                    user_id: userId,
                    coupon_id: coupon?.id || null,
                    order_code: orderCode,
                    discount_amount: discountAmount,
                    shipping_fee: shippingFee,
                    total_amount: totalAmount,
                    shipping_address: buildShippingAddress(shippingInfo),
                    note: shippingInfo.note?.trim() || null,
                    order_status: 'pending',
                    payment_status: 'unpaid',
                },
            });

            await tx.order_items.createMany({
                data: normalizedItems.map((item) => ({
                    order_id: createdOrder.id,
                    product_id: item.productId,
                    quantity: item.quantity,
                    unit_price: item.unitPrice,
                    subtotal: item.subtotal,
                })),
            });

            await tx.payments.create({
                data: {
                    order_id: createdOrder.id,
                    amount: totalAmount,
                    method: PAYMENT_METHOD_MAP[paymentMethod],
                    status: 'pending',
                    transaction_code: paymentTransactionCode,
                },
            });

            if (coupon?.id) {
                await tx.coupons.update({
                    where: { id: coupon.id },
                    data: {
                        used_count: {
                            increment: 1,
                        },
                        updated_at: new Date(),
                    },
                });
            }

            const adminNotification = await createAdminOrderPendingNotification(createdOrder, tx);

            const hydratedOrder = await tx.orders.findUnique({
                where: { id: createdOrder.id },
                select: ORDER_SELECT,
            });

            return {
                order: hydratedOrder,
                adminNotification,
                paymentUrl: null,
            };
        });

        if (orderResult.adminNotification) {
            emitAdminNotificationCreated(orderResult.adminNotification);
        }
        if (orderResult.order) {
            emitNewOrderToAdmins(normalizeOrder(orderResult.order));
            emitOrderStatusUpdated(normalizeOrder(orderResult.order));
        }

        new Created({
            message: 'Tạo đơn hàng thành công',
            metadata: {
                ...normalizeOrder(orderResult.order),
                paymentUrl: orderResult.paymentUrl,
            },
        }).send(res);
    }

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

    async getMyOrders(req, res) {
        const userId = Number(req.user?.userId || req.user?.id);

        const orders = await prisma.orders.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            select: ORDER_SELECT,
        });

        new OK({
            message: 'Lấy danh sách đơn hàng thành công',
            metadata: orders.map(normalizeOrder),
        }).send(res);
    }

    async getOrderById(req, res) {
        const orderId = Number(req.params.id);
        const userId = Number(req.user?.userId || req.user?.id);
        const role = req.user?.role;

        if (Number.isNaN(orderId)) {
            throw new BadRequestError('ID đơn hàng không hợp lệ');
        }

        const order = await prisma.orders.findUnique({
            where: { id: orderId },
            select: ORDER_SELECT,
        });

        if (!order) {
            throw new NotFoundError('Đơn hàng không tồn tại');
        }

        if (role !== 'admin' && Number(order.users?.id) !== userId) {
            throw new ForbiddenError('Bạn không có quyền xem đơn hàng này');
        }

        new OK({
            message: 'Lấy đơn hàng thành công',
            metadata: normalizeOrder(order),
        }).send(res);
    }

    async cancelOrder(req, res) {
        const orderId = Number(req.params.id);
        const userId = Number(req.user?.userId || req.user?.id);
        const role = req.user?.role;

        if (Number.isNaN(orderId)) {
            throw new BadRequestError('ID đơn hàng không hợp lệ');
        }

        const order = await prisma.orders.findUnique({
            where: { id: orderId },
            select: ORDER_SELECT,
        });

        if (!order) {
            throw new NotFoundError('Đơn hàng không tồn tại');
        }

        if (role !== 'admin' && Number(order.users?.id) !== userId) {
            throw new ForbiddenError('Bạn không có quyền hủy đơn hàng này');
        }

        if (!CANCELLABLE_STATUSES.includes(order.order_status)) {
            throw new BadRequestError('Chỉ có thể hủy đơn hàng đang chờ xử lý');
        }

        const updatedOrder = await prisma.orders.update({
            where: { id: orderId },
            data: {
                order_status: 'cancelled',
                updated_at: new Date(),
            },
            select: ORDER_SELECT,
        });

        new OK({
            message: 'Hủy đơn hàng thành công',
            metadata: normalizeOrder(updatedOrder),
        }).send(res);
    }

    async confirmReceivedOrder(req, res) {
        const orderId = Number(req.params.id);
        const userId = Number(req.user?.userId || req.user?.id);

        if (Number.isNaN(orderId)) {
            throw new BadRequestError('ID đơn hàng không hợp lệ');
        }

        const order = await prisma.orders.findUnique({
            where: { id: orderId },
            select: ORDER_SELECT,
        });

        if (!order) {
            throw new NotFoundError('Đơn hàng không tồn tại');
        }

        if (Number(order.users?.id) !== userId) {
            throw new ForbiddenError('Bạn không có quyền xác nhận đơn hàng này');
        }

        if (order.order_status !== 'shipping') {
            throw new BadRequestError('Chỉ có thể xác nhận nhận hàng khi đơn đang được giao');
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            const latestPayment = await tx.payments.findFirst({
                where: { order_id: orderId },
                orderBy: { created_at: 'desc' },
            });

            const isCodOrder = latestPayment?.method === 'cash';

            if (isCodOrder && latestPayment?.id && order.payment_status !== 'paid') {
                await tx.payments.update({
                    where: { id: latestPayment.id },
                    data: {
                        status: 'success',
                        paid_at: latestPayment.paid_at || new Date(),
                    },
                });
            }

            return tx.orders.update({
                where: { id: orderId },
                data: {
                    order_status: 'completed',
                    payment_status: isCodOrder ? 'paid' : order.payment_status,
                    updated_at: new Date(),
                },
                select: ORDER_SELECT,
            });
        });

        new OK({
            message: 'Xác nhận đã nhận hàng thành công',
            metadata: normalizeOrder(updatedOrder),
        }).send(res);
    }

    async updateOrderStatus(req, res) {
        const orderId = Number(req.params.id);
        const { status } = req.body;

        if (Number.isNaN(orderId)) {
            throw new BadRequestError('ID đơn hàng không hợp lệ');
        }

        const order = await prisma.orders.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundError('Đơn hàng không tồn tại');
        }

        const updatedOrder = await prisma.orders.update({
            where: { id: orderId },
            data: {
                order_status: status,
                updated_at: new Date(),
            },
            select: ORDER_SELECT,
        });

        new OK({
            message: 'Cập nhật trạng thái đơn hàng thành công',
            metadata: normalizeOrder(updatedOrder),
        }).send(res);
    }

    async updatePaymentStatus(req, res) {
        const orderId = Number(req.params.id);
        const { paymentStatus } = req.body;

        if (Number.isNaN(orderId)) {
            throw new BadRequestError('ID đơn hàng không hợp lệ');
        }

        const order = await prisma.orders.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundError('Đơn hàng không tồn tại');
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            await tx.orders.update({
                where: { id: orderId },
                data: {
                    payment_status: paymentStatus,
                    updated_at: new Date(),
                },
            });

            const latestPayment = await tx.payments.findFirst({
                where: { order_id: orderId },
                orderBy: { created_at: 'desc' },
            });

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

    async deleteOrder(req, res) {
        const orderId = Number(req.params.id);

        if (Number.isNaN(orderId)) {
            throw new BadRequestError('ID đơn hàng không hợp lệ');
        }

        const order = await prisma.orders.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundError('Đơn hàng không tồn tại');
        }

        await prisma.orders.delete({
            where: { id: orderId },
        });

        new OK({
            message: 'Xóa đơn hàng thành công',
            metadata: true,
        }).send(res);
    }
}

module.exports = new OrderController();
