const prisma = require('../config/prisma');

const NOTIFICATION_AUDIENCE = {
    ADMIN: 'admin',
    USER: 'user',
};

const NOTIFICATION_TYPE = {
    ORDER_PENDING_CONFIRMATION: 'order_pending_confirmation',
    ORDER_CONFIRMED: 'order_confirmed',
    ORDER_PREPARING: 'order_preparing',
    ORDER_SHIPPING: 'order_shipping',
    ORDER_CANCELLED: 'order_cancelled',
    ORDER_COMPLETED: 'order_completed',
};

function buildAdminPendingNotificationContent(orderCode) {
    return {
        title: 'Có đơn hàng mới cần xác nhận',
        message: `Đơn ${orderCode} đang chờ admin xác nhận trước khi chuyển sang chuẩn bị.`,
    };
}

function buildUserOrderStatusNotificationContent(orderCode, status) {
    const statusMap = {
        confirmed: {
            type: NOTIFICATION_TYPE.ORDER_CONFIRMED,
            title: 'Đơn hàng đã được xác nhận',
            message: `Đơn ${orderCode} đã được cửa hàng xác nhận.`,
        },
        preparing: {
            type: NOTIFICATION_TYPE.ORDER_PREPARING,
            title: 'Đơn hàng đang được chuẩn bị',
            message: `Đơn ${orderCode} đang được cửa hàng chuẩn bị.`,
        },
        shipping: {
            type: NOTIFICATION_TYPE.ORDER_SHIPPING,
            title: 'Đơn hàng đang giao vận',
            message: `Đơn ${orderCode} đã được bàn giao cho đơn vị vận chuyển.`,
        },
        cancelled: {
            type: NOTIFICATION_TYPE.ORDER_CANCELLED,
            title: 'Đơn hàng đã bị hủy',
            message: `Đơn ${orderCode} đã được chuyển sang trạng thái hủy.`,
        },
        completed: {
            type: NOTIFICATION_TYPE.ORDER_COMPLETED,
            title: 'Đơn hàng đã hoàn thành',
            message: `Đơn ${orderCode} đã hoàn tất.`,
        },
    };

    return statusMap[status] || null;
}

function normalizeNotification(notification) {
    if (!notification) {
        return notification;
    }

    const orderCode = notification.orders?.order_code || notification.order_code || 'đơn hàng';

    if (notification.type === NOTIFICATION_TYPE.ORDER_PENDING_CONFIRMATION) {
        return {
            ...notification,
            ...buildAdminPendingNotificationContent(orderCode),
        };
    }

    const userContent = buildUserOrderStatusNotificationContent(
        orderCode,
        notification.orders?.order_status || notification.type?.replace('order_', '')
    );

    if (userContent) {
        return {
            ...notification,
            title: userContent.title,
            message: userContent.message,
        };
    }

    return notification;
}

async function createNotification(data, tx = prisma) {
    return tx.notifications.create({
        data: {
            user_id: data.userId ?? null,
            order_id: data.orderId ?? null,
            audience: data.audience,
            type: data.type,
            title: data.title,
            message: data.message,
            is_read: false,
            is_deleted: false,
            read_at: null,
        },
    });
}

async function createAdminOrderPendingNotification(order, tx = prisma) {
    const content = buildAdminPendingNotificationContent(order.order_code);

    return createNotification(
        {
            audience: NOTIFICATION_AUDIENCE.ADMIN,
            type: NOTIFICATION_TYPE.ORDER_PENDING_CONFIRMATION,
            orderId: order.id,
            title: content.title,
            message: content.message,
        },
        tx
    );
}

async function createUserOrderStatusNotification({ userId, orderId, orderCode, status }, tx = prisma) {
    const content = buildUserOrderStatusNotificationContent(orderCode, status);

    if (!content || !userId) {
        return null;
    }

    return createNotification(
        {
            userId,
            orderId,
            audience: NOTIFICATION_AUDIENCE.USER,
            type: content.type,
            title: content.title,
            message: content.message,
        },
        tx
    );
}

module.exports = {
    NOTIFICATION_AUDIENCE,
    NOTIFICATION_TYPE,
    buildAdminPendingNotificationContent,
    buildUserOrderStatusNotificationContent,
    normalizeNotification,
    createNotification,
    createAdminOrderPendingNotification,
    createUserOrderStatusNotification,
};
