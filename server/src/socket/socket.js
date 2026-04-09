const { Server } = require('socket.io');

const prisma = require('../config/prisma');
const { verifyToken } = require('../auth/checkAuth');
const { SOCKET_EVENTS } = require('./events');

const SOCKET_ROOMS = {
    ADMIN: 'role:admin',
    USER: (userId) => `user:${userId}`,
};

let ioInstance = null;

function parseCookies(cookieHeader = '') {
    return String(cookieHeader)
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((cookies, part) => {
            const separatorIndex = part.indexOf('=');

            if (separatorIndex === -1) {
                return cookies;
            }

            const key = part.slice(0, separatorIndex).trim();
            const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
            cookies[key] = value;
            return cookies;
        }, {});
}

async function resolveSocketUser(socket) {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const accessToken = cookies.accessToken;

    if (!accessToken) {
        throw new Error('Unauthorized');
    }

    const decoded = verifyToken(accessToken);
    const userId = Number(decoded?.id || decoded?.userId);

    if (Number.isNaN(userId) || userId <= 0) {
        throw new Error('Unauthorized');
    }

    const user = await prisma.users.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            name: true,
            email: true,
        },
    });

    if (!user) {
        throw new Error('Unauthorized');
    }

    return user;
}

function initSocketServer(httpServer, allowedOrigins = []) {
    ioInstance = new Server(httpServer, {
        cors: {
            origin: Array.from(allowedOrigins),
            credentials: true,
        },
    });

    ioInstance.use(async (socket, next) => {
        try {
            const user = await resolveSocketUser(socket);
            socket.data.user = user;
            next();
        } catch (error) {
            next(error);
        }
    });

    ioInstance.on('connection', (socket) => {
        const user = socket.data.user;

        socket.join(SOCKET_ROOMS.USER(user.id));

        if (user.role === 'admin') {
            socket.join(SOCKET_ROOMS.ADMIN);
        }
    });

    return ioInstance;
}

function getIo() {
    return ioInstance;
}

function emitToAdmins(event, payload) {
    if (!ioInstance) return;
    ioInstance.to(SOCKET_ROOMS.ADMIN).emit(event, payload);
}

function emitToUser(userId, event, payload) {
    if (!ioInstance || !userId) return;
    ioInstance.to(SOCKET_ROOMS.USER(userId)).emit(event, payload);
}

function emitNewOrderToAdmins(order) {
    emitToAdmins(SOCKET_EVENTS.ADMIN_NEW_ORDER, {
        orderId: order.id,
        orderCode: order.order_code,
        orderStatus: order.order_status,
        paymentStatus: order.payment_status,
    });
}

function emitAdminNotificationCreated(notification) {
    emitToAdmins(SOCKET_EVENTS.ADMIN_NOTIFICATION_CREATED, {
        notificationId: notification?.id,
        orderId: notification?.order_id ?? null,
        type: notification?.type ?? null,
    });
}

function emitOrderStatusUpdated(order) {
    if (!order) return;

    emitToAdmins(SOCKET_EVENTS.ADMIN_ORDER_STATUS_UPDATED, {
        orderId: order.id,
        orderCode: order.order_code,
        orderStatus: order.order_status,
        paymentStatus: order.payment_status,
        userId: order.user_id ?? null,
    });

    if (order.user_id) {
        emitToUser(order.user_id, SOCKET_EVENTS.USER_ORDER_STATUS_UPDATED, {
            orderId: order.id,
            orderCode: order.order_code,
            orderStatus: order.order_status,
            paymentStatus: order.payment_status,
        });
    }
}

function emitUserNotificationCreated(userId, notification) {
    emitToUser(userId, SOCKET_EVENTS.USER_NOTIFICATION_CREATED, {
        notificationId: notification?.id,
        orderId: notification?.order_id ?? null,
        type: notification?.type ?? null,
    });
}

module.exports = {
    SOCKET_EVENTS,
    SOCKET_ROOMS,
    getIo,
    initSocketServer,
    emitToAdmins,
    emitToUser,
    emitNewOrderToAdmins,
    emitAdminNotificationCreated,
    emitOrderStatusUpdated,
    emitUserNotificationCreated,
};
