'use strict';

const { BadRequestError, UnprocessableEntityError } = require('../core/error.response');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^(0|\+84)[0-9]{9}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,50}$/;

function hasValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
}

function validateCoordinates(latitude, longitude) {
    if (hasValue(latitude) && Number.isNaN(Number(latitude))) {
        throw new BadRequestError('Vĩ độ không hợp lệ');
    }

    if (hasValue(longitude) && Number.isNaN(Number(longitude))) {
        throw new BadRequestError('Kinh độ không hợp lệ');
    }
}

const validateRegister = (req, res, next) => {
    try {
        const { name, email, password, phone, address, latitude, longitude } = req.body;

        if (!name || typeof name !== 'string') {
            throw new BadRequestError('Tên là bắt buộc');
        }

        const cleanName = name.trim();

        if (cleanName.length < 2) {
            throw new BadRequestError('Tên quá ngắn');
        }

        if (cleanName.length > 100) {
            throw new BadRequestError('Tên quá dài');
        }

        if (!email || typeof email !== 'string') {
            throw new BadRequestError('Email là bắt buộc');
        }

        if (!emailRegex.test(email.trim())) {
            throw new UnprocessableEntityError('Email không đúng định dạng');
        }

        if (!password || typeof password !== 'string') {
            throw new BadRequestError('Mật khẩu là bắt buộc');
        }

        if (!passwordRegex.test(password)) {
            throw new UnprocessableEntityError('Mật khẩu phải từ 8-50 ký tự, gồm cả chữ và số');
        }

        if (phone && !phoneRegex.test(phone.trim())) {
            throw new UnprocessableEntityError('Số điện thoại không hợp lệ');
        }

        if (address && address.trim().length < 5) {
            throw new BadRequestError('Địa chỉ quá ngắn');
        }

        validateCoordinates(latitude, longitude);

        next();
    } catch (error) {
        next(error);
    }
};

const validateLogin = (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new BadRequestError('Email và mật khẩu là bắt buộc');
        }

        if (!emailRegex.test(email.trim())) {
            throw new UnprocessableEntityError('Email không đúng định dạng');
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validateForgotPassword = (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            throw new BadRequestError('Email là bắt buộc');
        }

        if (!emailRegex.test(email.trim())) {
            throw new UnprocessableEntityError('Email không đúng định dạng');
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validateResetPassword = (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            throw new BadRequestError('Mật khẩu cũ và mật khẩu mới là bắt buộc');
        }

        if (!passwordRegex.test(newPassword)) {
            throw new UnprocessableEntityError('Mật khẩu mới không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validateVerifyForgotPassword = (req, res, next) => {
    try {
        const { otp, password } = req.body;

        if (!otp || typeof otp !== 'string' || !otp.trim()) {
            throw new BadRequestError('OTP là bắt buộc');
        }

        if (!/^\d{6}$/.test(otp.trim())) {
            throw new UnprocessableEntityError('OTP không đúng định dạng');
        }

        if (!password || typeof password !== 'string') {
            throw new BadRequestError('Mật khẩu mới là bắt buộc');
        }

        if (!passwordRegex.test(password)) {
            throw new UnprocessableEntityError('Mật khẩu mới không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validateVerifyResetPassword = (req, res, next) => {
    try {
        const { otp } = req.body;

        if (!otp || typeof otp !== 'string' || !otp.trim()) {
            throw new BadRequestError('OTP là bắt buộc');
        }

        if (!/^\d{6}$/.test(otp.trim())) {
            throw new UnprocessableEntityError('OTP không đúng định dạng');
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validateUpdateProfile = (req, res, next) => {
    try {
        const { name, phone, address, latitude, longitude } = req.body;

        if (!name || typeof name !== 'string') {
            throw new BadRequestError('Tên là bắt buộc');
        }

        const cleanName = name.trim();

        if (cleanName.length < 2) {
            throw new BadRequestError('Tên quá ngắn');
        }

        if (cleanName.length > 100) {
            throw new BadRequestError('Tên quá dài');
        }

        if (phone && !phoneRegex.test(phone.trim())) {
            throw new UnprocessableEntityError('Số điện thoại không hợp lệ');
        }

        if (address && address.trim().length < 5) {
            throw new BadRequestError('Địa chỉ quá ngắn');
        }

        validateCoordinates(latitude, longitude);

        next();
    } catch (error) {
        next(error);
    }
};

const validateUpdateUserRole = (req, res, next) => {
    try {
        const { role } = req.body;

        if (!role || typeof role !== 'string') {
            throw new BadRequestError('Vai trò là bắt buộc');
        }

        const validRoles = ['customer', 'admin'];

        if (!validRoles.includes(role)) {
            throw new BadRequestError('Vai trò không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    validateRegister,
    validateLogin,
    validateForgotPassword,
    validateResetPassword,
    validateVerifyForgotPassword,
    validateVerifyResetPassword,
    validateUpdateProfile,
    validateUpdateUserRole,
};
