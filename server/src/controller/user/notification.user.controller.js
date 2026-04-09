const prisma = require('../../config/prisma');
const {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
} = require('../../core/error.response');
const { OK } = require('../../core/success.response');
const { normalizeNotification } = require('../../services/notification.service');

class NotificationUserController {
    async getMyNotifications(req, res) {
        const userId = Number(req.user?.userId || req.user?.id);

        const notifications = await prisma.notifications.findMany({
            where: {
                audience: 'user',
                user_id: userId,
                is_deleted: false,
            },
            orderBy: {
                created_at: 'desc',
            },
            include: {
                orders: {
                    select: {
                        id: true,
                        order_code: true,
                        order_status: true,
                        payment_status: true,
                    },
                },
            },
        });

        new OK({
            message: 'Lấy thông báo của bạn thành công',
            metadata: notifications.map(normalizeNotification),
        }).send(res);
    }

    async markAsRead(req, res) {
        const userId = Number(req.user?.userId || req.user?.id);
        const notificationId = Number(req.params.id);

        if (Number.isNaN(notificationId)) {
            throw new BadRequestError('ID thông báo không hợp lệ');
        }

        const notification = await prisma.notifications.findUnique({
            where: { id: notificationId },
        });

        if (!notification || notification.is_deleted) {
            throw new NotFoundError('Thông báo không tồn tại');
        }

        if (notification.audience !== 'user' || Number(notification.user_id) !== userId) {
            throw new ForbiddenError('Bạn không có quyền thao tác thông báo này');
        }

        const updatedNotification = await prisma.notifications.update({
            where: { id: notificationId },
            data: {
                is_read: true,
                read_at: notification.read_at || new Date(),
                updated_at: new Date(),
            },
        });

        new OK({
            message: 'Đã đánh dấu thông báo đã đọc',
            metadata: updatedNotification,
        }).send(res);
    }

    async markAllAsRead(req, res) {
        const userId = Number(req.user?.userId || req.user?.id);
        const now = new Date();

        const result = await prisma.notifications.updateMany({
            where: {
                audience: 'user',
                user_id: userId,
                is_deleted: false,
                is_read: false,
            },
            data: {
                is_read: true,
                read_at: now,
                updated_at: now,
            },
        });

        new OK({
            message: 'Đã đánh dấu tất cả thông báo là đã đọc',
            metadata: {
                count: result.count,
            },
        }).send(res);
    }

    async deleteNotification(req, res) {
        const userId = Number(req.user?.userId || req.user?.id);
        const notificationId = Number(req.params.id);

        if (Number.isNaN(notificationId)) {
            throw new BadRequestError('ID thông báo không hợp lệ');
        }

        const notification = await prisma.notifications.findUnique({
            where: { id: notificationId },
        });

        if (!notification || notification.is_deleted) {
            throw new NotFoundError('Thông báo không tồn tại');
        }

        if (notification.audience !== 'user' || Number(notification.user_id) !== userId) {
            throw new ForbiddenError('Bạn không có quyền thao tác thông báo này');
        }

        const updatedNotification = await prisma.notifications.update({
            where: { id: notificationId },
            data: {
                is_deleted: true,
                updated_at: new Date(),
            },
        });

        new OK({
            message: 'Đã xóa thông báo',
            metadata: updatedNotification,
        }).send(res);
    }

    async clearNotifications(req, res) {
        const userId = Number(req.user?.userId || req.user?.id);

        const result = await prisma.notifications.updateMany({
            where: {
                audience: 'user',
                user_id: userId,
                is_deleted: false,
            },
            data: {
                is_deleted: true,
                updated_at: new Date(),
            },
        });

        new OK({
            message: 'Đã xóa tất cả thông báo',
            metadata: {
                count: result.count,
            },
        }).send(res);
    }
}

module.exports = new NotificationUserController();
