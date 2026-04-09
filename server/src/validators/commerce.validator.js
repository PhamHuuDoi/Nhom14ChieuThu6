'use strict';

const { BadRequestError, UnprocessableEntityError } = require('../core/error.response');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^(0|\+84)[0-9]{9}$/;
const validPaymentMethods = ['cod', 'momo', 'vnpay', 'zalopay'];

function ensurePositiveInteger(value, message) {
    const normalized = Number(value);

    if (!Number.isInteger(normalized) || normalized <= 0) {
        throw new BadRequestError(message);
    }

    return normalized;
}

function ensureNonNegativeNumber(value, message) {
    const normalized = Number(value);

    if (Number.isNaN(normalized) || normalized < 0) {
        throw new BadRequestError(message);
    }

    return normalized;
}

const validateAddToCart = (req, res, next) => {
    try {
        ensurePositiveInteger(req.body.productId, 'productId không hợp lệ');

        if (req.body.quantity !== undefined) {
            ensurePositiveInteger(req.body.quantity, 'Số lượng sản phẩm không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validateUpdateCartQuantity = (req, res, next) => {
    try {
        ensurePositiveInteger(req.params.id, 'ID sản phẩm không hợp lệ');

        const quantity = Number(req.body.quantity);

        if (!Number.isInteger(quantity) || quantity < 0) {
            throw new BadRequestError('Số lượng cập nhật không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validateCheckout = (req, res, next) => {
    try {
        const { shippingInfo, paymentMethod, items, couponCode } = req.body;

        if (!shippingInfo || typeof shippingInfo !== 'object' || Array.isArray(shippingInfo)) {
            throw new BadRequestError('Thông tin giao hàng không hợp lệ');
        }

        const requiredShippingFields = [
            ['fullName', 'Họ tên người nhận là bắt buộc'],
            ['phone', 'Số điện thoại người nhận là bắt buộc'],
            ['email', 'Email người nhận là bắt buộc'],
            ['address', 'Địa chỉ giao hàng là bắt buộc'],
        ];

        requiredShippingFields.forEach(([field, message]) => {
            if (!String(shippingInfo[field] || '').trim()) {
                throw new BadRequestError(message);
            }
        });

        if (!phoneRegex.test(String(shippingInfo.phone).trim())) {
            throw new UnprocessableEntityError('Số điện thoại người nhận không hợp lệ');
        }

        if (!emailRegex.test(String(shippingInfo.email).trim())) {
            throw new UnprocessableEntityError('Email người nhận không hợp lệ');
        }

        if (String(shippingInfo.address).trim().length < 5) {
            throw new BadRequestError('Địa chỉ giao hàng quá ngắn');
        }

        if (shippingInfo.note !== undefined && String(shippingInfo.note).trim().length > 500) {
            throw new BadRequestError('Ghi chú quá dài');
        }

        if (!validPaymentMethods.includes(String(paymentMethod || '').toLowerCase())) {
            throw new BadRequestError('Phương thức thanh toán không hợp lệ');
        }

        if (!Array.isArray(items) || items.length === 0) {
            throw new BadRequestError('Đơn hàng phải có ít nhất một sản phẩm');
        }

        items.forEach((item, index) => {
            ensurePositiveInteger(item?.productId, `productId tại vị trí ${index + 1} không hợp lệ`);
            ensurePositiveInteger(item?.quantity, `Số lượng tại vị trí ${index + 1} không hợp lệ`);
        });

        if (couponCode !== undefined && couponCode !== null && String(couponCode).trim().length > 50) {
            throw new BadRequestError('Mã giảm giá không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validateCouponCode = (req, res, next) => {
    try {
        const { code, subtotal } = req.body;

        if (!String(code || '').trim()) {
            throw new BadRequestError('Mã giảm giá là bắt buộc');
        }

        ensureNonNegativeNumber(subtotal, 'Subtotal không hợp lệ');
        next();
    } catch (error) {
        next(error);
    }
};

const validateCreatePayment = (req, res, next) => {
    try {
        ensurePositiveInteger(req.params.orderId || req.body.orderId, 'ID đơn hàng không hợp lệ');

        const paymentMethod = String(req.body.paymentMethod || req.body.typePayment || '').toLowerCase();

        if (!validPaymentMethods.includes(paymentMethod)) {
            throw new BadRequestError('Phương thức thanh toán không hợp lệ');
        }

        if (paymentMethod === 'cod') {
            throw new BadRequestError('COD không cần tạo liên kết thanh toán');
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validateShippingFeeQuote = (req, res, next) => {
    try {
        const { customerLatitude, customerLongitude } = req.body;
        const latitude = Number(customerLatitude);
        const longitude = Number(customerLongitude);

        if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
            throw new BadRequestError('customerLatitude không hợp lệ');
        }

        if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
            throw new BadRequestError('customerLongitude không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    validateAddToCart,
    validateUpdateCartQuantity,
    validateCheckout,
    validateCouponCode,
    validateCreatePayment,
    validateShippingFeeQuote,
};
