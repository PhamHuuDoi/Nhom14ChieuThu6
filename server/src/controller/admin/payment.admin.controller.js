const axios = require('axios');
const crypto = require('crypto');

const prisma = require('../../config/prisma');
const { BadRequestError, ForbiddenError, NotFoundError } = require('../../core/error.response');
const { Created, OK } = require('../../core/success.response');
const {
    PAYMENT_METHOD_MAP,
    PAYMENT_STATUS_TO_ORDER_STATUS,
    PAYMENT_SELECT,
    createTransactionCode,
    getMissingGatewayConfig,
    normalizePayment,
} = require('../../services/payment.service');

function getCurrentUserId(req) {
    return Number(req.user?.userId || req.user?.id);
}

function isAdmin(req) {
    return req.user?.role === 'admin';
}

function getServerBaseUrl() {
    return process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
}

function getClientBaseUrl() {
    return process.env.CLIENT_URL || 'http://localhost:3000';
}

function getRequestIp(req) {
    const forwarded = req.headers['x-forwarded-for'];

    if (Array.isArray(forwarded) && forwarded.length > 0) {
        return forwarded[0];
    }

    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

function buildSortedQuery(params) {
    return Object.keys(params)
        .sort()
        .map((key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
        .join('&');
}

function formatVnpayDate(date) {
    const pad = (value) => String(value).padStart(2, '0');
    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds()),
    ].join('');
}

function getProviderConfig(provider) {
    const normalizedProvider = String(provider || '').toLowerCase();

    if (normalizedProvider === 'vnpay') {
        return {
            tmnCode: process.env.VNPAY_TMN_CODE || 'GXNEFG79',
            hashSecret: process.env.VNPAY_HASH_SECRET || 'S25L99I5SAAP0E84QNH2SXX85P6C36BR',
            paymentUrl: process.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
            returnUrl: process.env.VNPAY_RETURN_URL || `${getServerBaseUrl()}/api/payments/callback/vnpay`,
        };
    }

    if (normalizedProvider === 'momo') {
        return {
            partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
            accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
            secretKey: process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
            paymentUrl: process.env.MOMO_PAYMENT_URL || 'https://test-payment.momo.vn/v2/gateway/api/create',
            redirectUrl: process.env.MOMO_RETURN_URL || `${getServerBaseUrl()}/api/payments/callback/momo`,
            ipnUrl: process.env.MOMO_IPN_URL || `${getServerBaseUrl()}/api/payments/callback/momo`,
        };
    }

    if (normalizedProvider === 'zalopay') {
        return {
            appId: process.env.ZALOPAY_APP_ID || '2553',
            key1: process.env.ZALOPAY_KEY1 || 'PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL',
            key2: process.env.ZALOPAY_KEY2 || 'kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz',
            paymentUrl: process.env.ZALOPAY_PAYMENT_URL || 'https://sb-openapi.zalopay.vn/v2/create',
            redirectUrl: process.env.ZALOPAY_RETURN_URL || `${getClientBaseUrl()}/checkout/success`,
            callbackUrl: process.env.ZALOPAY_CALLBACK_URL || `${getServerBaseUrl()}/api/payments/callback/zalopay`,
        };
    }

    throw new BadRequestError('Cổng thanh toán không hợp lệ');
}

function getProviderDisplayName(provider) {
    if (provider === 'vnpay') return 'VNPay';
    if (provider === 'momo') return 'MoMo';
    if (provider === 'zalopay') return 'ZaloPay';
    return provider;
}

async function getPaymentWithOrder(orderId) {
    return prisma.payments.findFirst({
        where: { order_id: orderId },
        orderBy: { created_at: 'desc' },
        select: PAYMENT_SELECT,
    });
}

function ensureOrderAccess(payment, req) {
    const userId = getCurrentUserId(req);
    const ownerId = Number(payment?.orders?.users?.id);

    if (!isAdmin(req) && ownerId !== userId) {
        throw new ForbiddenError('Bạn không có quyền truy cập thanh toán này');
    }
}

async function updatePaymentState({ orderId, provider, status, transactionCode }) {
    const payment = await getPaymentWithOrder(orderId);

    if (!payment) {
        throw new NotFoundError('Không tìm thấy giao dịch thanh toán');
    }

    const nextPaymentStatus = status === 'success' ? 'success' : 'failed';
    const nextOrderPaymentStatus = PAYMENT_STATUS_TO_ORDER_STATUS[nextPaymentStatus];
    const nextOrderStatus = payment.orders.order_status;

    await prisma.$transaction([
        prisma.payments.update({
            where: { id: payment.id },
            data: {
                method: PAYMENT_METHOD_MAP[provider],
                status: nextPaymentStatus,
                transaction_code: transactionCode || payment.transaction_code,
                paid_at: nextPaymentStatus === 'success' ? new Date() : null,
            },
        }),
        prisma.orders.update({
            where: { id: orderId },
            data: {
                payment_status: nextOrderPaymentStatus,
                order_status: nextOrderStatus,
                updated_at: new Date(),
            },
        }),
    ]);
}

async function buildProviderPaymentUrl({ provider, order, payment, req }) {
    const missingEnv = getMissingGatewayConfig(provider);

    if (missingEnv.length > 0) {
        throw new BadRequestError(
            `Cổng thanh toán ${getProviderDisplayName(provider)} chưa được cấu hình đầy đủ. Thiếu: ${missingEnv.join(
                ', '
            )}`
        );
    }

    if (provider === 'vnpay') {
        const config = getProviderConfig(provider);
        const now = new Date();
        const expireDate = new Date(now.getTime() + 15 * 60 * 1000);
        const params = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: config.tmnCode,
            vnp_Amount: String(Math.round(Number(payment.amount || order.total_amount) * 100)),
            vnp_CurrCode: 'VND',
            vnp_TxnRef: payment.transaction_code,
            vnp_OrderInfo: `Thanh toán Đơn hàng ${order.order_code}`,
            vnp_OrderType: 'other',
            vnp_Locale: 'vn',
            vnp_ReturnUrl: `${config.returnUrl}?orderId=${order.id}`,
            vnp_IpAddr: getRequestIp(req),
            vnp_CreateDate: formatVnpayDate(now),
            vnp_ExpireDate: formatVnpayDate(expireDate),
        };

        const signData = buildSortedQuery(params);
        const secureHash = crypto.createHmac('sha512', config.hashSecret).update(signData).digest('hex');
        const redirectUrl = new URL(config.paymentUrl);

        Object.entries(params).forEach(([key, value]) => redirectUrl.searchParams.set(key, value));
        redirectUrl.searchParams.set('vnp_SecureHash', secureHash);

        return redirectUrl.toString();
    }

    if (provider === 'momo') {
        const config = getProviderConfig(provider);
        const amount = Math.round(Number(payment.amount || order.total_amount));
        const redirectUrl = `${config.redirectUrl}?orderId=${order.id}`;
        const ipnUrl = `${config.ipnUrl}?orderId=${order.id}`;
        const requestType = 'payWithMethod';
        const rawSignature = [
            `accessKey=${config.accessKey}`,
            `amount=${amount}`,
            'extraData=',
            `ipnUrl=${ipnUrl}`,
            `orderId=${payment.transaction_code}`,
            `orderInfo=Thanh toán Đơn hàng ${order.order_code}`,
            `partnerCode=${config.partnerCode}`,
            `redirectUrl=${redirectUrl}`,
            `requestId=${payment.transaction_code}`,
            `requestType=${requestType}`,
        ].join('&');
        const signature = crypto.createHmac('sha256', config.secretKey).update(rawSignature).digest('hex');
        const response = await axios.post(
            config.paymentUrl,
            {
                partnerCode: config.partnerCode,
                partnerName: 'The Zoo Coffee',
                storeId: 'TheZooCoffee',
                requestId: payment.transaction_code,
                amount,
                orderId: payment.transaction_code,
                orderInfo: `Thanh toán Đơn hàng ${order.order_code}`,
                redirectUrl,
                ipnUrl,
                lang: 'vi',
                requestType,
                autoCapture: true,
                extraData: '',
                orderGroupId: '',
                signature,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.data?.payUrl) {
            throw new BadRequestError(response.data?.message || 'Không tạo được liên kết thanh toán MoMo');
        }

        return response.data.payUrl;
    }

    if (provider === 'zalopay') {
        const config = getProviderConfig(provider);
        const appTime = Date.now();
        const appTransId = `${new Date().toISOString().slice(2, 10).replace(/-/g, '')}_${order.id}_${appTime}`;
        const amount = Math.round(Number(payment.amount || order.total_amount));
        const items = (order.order_items || []).map((item) => ({
            itemid: item.products?.id || item.id,
            itemname: item.products?.name || `Product ${item.id}`,
            itemprice: Math.round(Number(item.unit_price || 0)),
            itemquantity: item.quantity,
        }));
        const embedData = {
            redirecturl: `${config.redirectUrl}?orderId=${order.id}`,
        };
        const macInput = [
            config.appId,
            appTransId,
            String(order.id),
            amount,
            appTime,
            JSON.stringify(embedData),
            JSON.stringify(items),
        ].join('|');
        const mac = crypto.createHmac('sha256', config.key1).update(macInput).digest('hex');
        const response = await axios.post(config.paymentUrl, null, {
            params: {
                app_id: config.appId,
                app_trans_id: appTransId,
                app_user: String(order.id),
                app_time: appTime,
                amount,
                item: JSON.stringify(items),
                embed_data: JSON.stringify(embedData),
                description: `ZaloPay - Thanh toán Đơn hàng ${order.order_code}`,
                bank_code: '',
                callback_url: `${config.callbackUrl}?orderId=${order.id}`,
                mac,
            },
        });

        if (!response.data?.order_url) {
            throw new BadRequestError(response.data?.return_message || 'Không tạo được liên kết thanh toán ZaloPay');
        }

        return response.data.order_url;
    }

    throw new BadRequestError('Phương thức thanh toán không hợp lệ');
}

class PaymentController {
    async gatewayPage(req, res) {
        return res.status(410).json({
            success: false,
            message: 'Đã loại bỏ gateway sandbox nội bộ. Hãy gọi /api/payments/:orderId/initiate để lấy URL thanh toán thật.',
        });
    }

    async createPayment(req, res) {
        const orderId = Number(req.params.orderId || req.body.orderId);
        const paymentMethod = String(req.body.paymentMethod || req.body.typePayment || '').toLowerCase();

        if (Number.isNaN(orderId)) {
            throw new BadRequestError('ID Đơn hàng không hợp lệ');
        }

        if (!paymentMethod || !PAYMENT_METHOD_MAP[paymentMethod]) {
            throw new BadRequestError('Phương thức thanh toán không hợp lệ');
        }

        if (paymentMethod === 'cod') {
            throw new BadRequestError('COD không cần tạo liên kết thanh toán');
        }

        const payment = await getPaymentWithOrder(orderId);

        if (!payment) {
            throw new NotFoundError('Không tìm thấy bản ghi thanh toán');
        }

        ensureOrderAccess(payment, req);

        if (payment.orders.order_status === 'cancelled') {
            throw new BadRequestError('Không thể thanh toán đơn hàng đã hủy');
        }

        if (payment.status === 'success') {
            return new OK({
                message: 'Đơn hàng đã được thanh toán',
                metadata: {
                    ...normalizePayment(payment),
                    paymentUrl: null,
                },
            }).send(res);
        }

        const transactionCode = createTransactionCode(paymentMethod, payment.orders.order_code);
        const updatedPayment = await prisma.payments.update({
            where: { id: payment.id },
            data: {
                method: PAYMENT_METHOD_MAP[paymentMethod],
                status: 'pending',
                transaction_code: transactionCode,
            },
            select: PAYMENT_SELECT,
        });

        const paymentUrl = await buildProviderPaymentUrl({
            provider: paymentMethod,
            order: updatedPayment.orders,
            payment: updatedPayment,
            req,
        });

        return new Created({
            message: 'Tạo liên kết thanh toán thành công',
            metadata: {
                ...normalizePayment(updatedPayment),
                paymentUrl,
            },
        }).send(res);
    }

    async paymentCallback(req, res) {
        const provider = String(req.params.provider || '').toLowerCase();
        const orderId = Number(req.query.orderId || req.body.orderId);

        if (!PAYMENT_METHOD_MAP[provider]) {
            throw new BadRequestError('Cổng thanh toán không hợp lệ');
        }

        if (Number.isNaN(orderId)) {
            throw new BadRequestError('ID Đơn hàng không hợp lệ');
        }

        let status = 'failed';
        let transactionCode = '';

        if (provider === 'vnpay') {
            status = String(req.query.vnp_ResponseCode) === '00' ? 'success' : 'failed';
            transactionCode = String(req.query.vnp_TxnRef || '');
        } else if (provider === 'momo') {
            status = String(req.query.resultCode) === '0' ? 'success' : 'failed';
            transactionCode = String(req.query.orderId || '');
        } else {
            status = String(req.query.status || '').toLowerCase() === 'success' ? 'success' : 'failed';
            transactionCode = String(req.query.transactionCode || '');
        }

        await updatePaymentState({
            orderId,
            provider,
            status,
            transactionCode,
        });

        const redirectUrl =
            status === 'success'
                ? `${getClientBaseUrl()}/checkout/success?orderId=${orderId}`
                : `${getClientBaseUrl()}/checkoutạorderId=${orderId}&payment=failed`;

        return res.redirect(redirectUrl);
    }

    async zalopayCallback(req, res) {
        const orderId = Number(req.query.orderId || req.body.orderId);
        const dataStr = req.body.data;
        const reqMac = req.body.mac;
        const config = getProviderConfig('zalopay');

        if (!dataStr || !reqMac || Number.isNaN(orderId)) {
            return res.json({ return_code: -1, return_message: 'invalid callback' });
        }

        const mac = crypto.createHmac('sha256', config.key2).update(dataStr).digest('hex');

        if (mac !== reqMac) {
            return res.json({ return_code: -1, return_message: 'invalid mac' });
        }

        const callbackData = JSON.parse(dataStr);

        await updatePaymentState({
            orderId,
            provider: 'zalopay',
            status: 'success',
            transactionCode: String(callbackData.app_trans_id || callbackData.zp_trans_id || ''),
        });

        return res.json({ return_code: 1, return_message: 'success' });
    }

    async getPaymentsAdmin(req, res) {
        const payments = await prisma.payments.findMany({
            orderBy: { created_at: 'desc' },
            select: PAYMENT_SELECT,
        });

        return new OK({
            message: 'Lấy danh sách thanh toán thành công',
            metadata: payments.map(normalizePayment),
        }).send(res);
    }

    async updatePayment(req, res) {
        const orderId = Number(req.params.orderId);
        const nextStatus = String(req.body.status || '').toLowerCase();
        const validStatuses = ['pending', 'success', 'failed', 'refunded'];

        if (Number.isNaN(orderId)) {
            throw new BadRequestError('ID Đơn hàng không hợp lệ');
        }

        if (!validStatuses.includes(nextStatus)) {
            throw new BadRequestError('Trạng thái thanh toán không hợp lệ');
        }

        const payment = await getPaymentWithOrder(orderId);

        if (!payment) {
            throw new NotFoundError('Không tìm thấy giao dịch thanh toán');
        }

        const updatedPayment = await prisma.$transaction(async (tx) => {
            await tx.orders.update({
                where: { id: orderId },
                data: {
                    payment_status: PAYMENT_STATUS_TO_ORDER_STATUS[nextStatus],
                    updated_at: new Date(),
                },
            });

            return tx.payments.update({
                where: { id: payment.id },
                data: {
                    status: nextStatus,
                    paid_at: nextStatus === 'success' ? payment.paid_at || new Date() : null,
                },
                select: PAYMENT_SELECT,
            });
        });

        return new OK({
            message: 'Cập nhật thanh toán thành công',
            metadata: normalizePayment(updatedPayment),
        }).send(res);
    }

    async getPaymentById(req, res) {
        const orderId = Number(req.params.orderId);

        if (Number.isNaN(orderId)) {
            throw new BadRequestError('ID Đơn hàng không hợp lệ');
        }

        const payment = await getPaymentWithOrder(orderId);

        if (!payment) {
            throw new NotFoundError('Không tìm thấy giao dịch thanh toán');
        }

        ensureOrderAccess(payment, req);

        return new OK({
            message: 'Lấy thông tin thanh toán thành công',
            metadata: normalizePayment(payment),
        }).send(res);
    }
}

module.exports = new PaymentController();
