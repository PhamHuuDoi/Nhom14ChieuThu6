'use strict';

const { BadRequestError } = require('../core/error.response');

const validOrderStatuses = ['pending', 'confirmed', 'preparing', 'shipping', 'completed', 'cancelled'];

const validPaymentStatuses = ['unpaid', 'paid', 'failed', 'refunded'];

const validateOrderStatus = (req, res, next) => {
    try {
        const { status } = req.body;

        if (!status || typeof status !== 'string' || !validOrderStatuses.includes(status)) {
            throw new BadRequestError('Trạng thái đơn hàng không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validatePaymentStatus = (req, res, next) => {
    try {
        const { paymentStatus } = req.body;

        if (!paymentStatus || typeof paymentStatus !== 'string' || !validPaymentStatuses.includes(paymentStatus)) {
            throw new BadRequestError('Trạng thái thanh toán không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    validateOrderStatus,
    validatePaymentStatus,
};
