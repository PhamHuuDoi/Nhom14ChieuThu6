const PAYMENT_METHOD_MAP = {
    cod: 'cash',
    momo: 'momo',
    vnpay: 'vnpay',
    zalopay: 'zalopay',
};

const PROVIDER_REQUIRED_ENV = {
    vnpay: ['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET', 'VNPAY_PAYMENT_URL', 'VNPAY_RETURN_URL'],
    momo: ['MOMO_PARTNER_CODE', 'MOMO_ACCESS_KEY', 'MOMO_SECRET_KEY', 'MOMO_PAYMENT_URL', 'MOMO_RETURN_URL'],
    zalopay: ['ZALOPAY_APP_ID', 'ZALOPAY_KEY1', 'ZALOPAY_KEY2', 'ZALOPAY_PAYMENT_URL', 'ZALOPAY_CALLBACK_URL'],
};

const PAYMENT_STATUS_TO_ORDER_STATUS = {
    success: 'paid',
    failed: 'failed',
    refunded: 'refunded',
    pending: 'unpaid',
};

const PAYMENT_SELECT = {
    id: true,
    order_id: true,
    amount: true,
    method: true,
    status: true,
    transaction_code: true,
    paid_at: true,
    created_at: true,
    orders: {
        select: {
            id: true,
            order_code: true,
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
        },
    },
};

function createTransactionCode(provider, orderRef) {
    return `${String(provider).toUpperCase()}-${orderRef}-${Date.now()}`;
}

function getMissingGatewayConfig(provider) {
    const normalizedProvider = String(provider || '').toLowerCase();
    const requiredEnv = PROVIDER_REQUIRED_ENV[normalizedProvider] || [];

    return requiredEnv.filter((envName) => !process.env[envName]?.trim());
}

function normalizePayment(payment) {
    if (!payment) {
        return payment;
    }

    return {
        ...payment,
        order: payment.orders
            ? {
                  ...payment.orders,
                  user: payment.orders.users,
              }
            : null,
    };
}

module.exports = {
    PAYMENT_METHOD_MAP,
    PAYMENT_STATUS_TO_ORDER_STATUS,
    PAYMENT_SELECT,
    createTransactionCode,
    getMissingGatewayConfig,
    normalizePayment,
};
