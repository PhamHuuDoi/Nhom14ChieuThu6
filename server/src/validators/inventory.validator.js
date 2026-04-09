'use strict';

const { BadRequestError, UnprocessableEntityError } = require('../core/error.response');

const validateCreateInventory = (req, res, next) => {
    try {
        const { name, unit, quantity, minQuantity, costPrice, supplierName, status } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            throw new BadRequestError('Tên nguyên liệu là bắt buộc');
        }

        if (!unit || typeof unit !== 'string' || unit.trim().length < 1) {
            throw new BadRequestError('Đơn vị tính là bắt buộc');
        }

        if (quantity !== undefined && Number.isNaN(Number(quantity))) {
            throw new UnprocessableEntityError('Số lượng tồn không hợp lệ');
        }

        if (minQuantity !== undefined && Number.isNaN(Number(minQuantity))) {
            throw new UnprocessableEntityError('Mức tồn tối thiểu không hợp lệ');
        }

        if (costPrice !== undefined && Number.isNaN(Number(costPrice))) {
            throw new UnprocessableEntityError('Giá nhập không hợp lệ');
        }

        if (status && !['available', 'out_of_stock'].includes(status)) {
            throw new UnprocessableEntityError('Trạng thái nguyên liệu không hợp lệ');
        }

        if (supplierName && typeof supplierName !== 'string') {
            throw new UnprocessableEntityError('Tên nhà cung cấp không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validateUpdateInventory = (req, res, next) => {
    try {
        const { name, unit, quantity, minQuantity, costPrice, supplierName, status } = req.body;

        if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
            throw new BadRequestError('Tên nguyên liệu phải có ít nhất 2 ký tự');
        }

        if (unit !== undefined && (typeof unit !== 'string' || unit.trim().length < 1)) {
            throw new BadRequestError('Đơn vị tính là bắt buộc');
        }

        if (quantity !== undefined && Number.isNaN(Number(quantity))) {
            throw new UnprocessableEntityError('Số lượng tồn không hợp lệ');
        }

        if (minQuantity !== undefined && Number.isNaN(Number(minQuantity))) {
            throw new UnprocessableEntityError('Mức tồn tối thiểu không hợp lệ');
        }

        if (costPrice !== undefined && Number.isNaN(Number(costPrice))) {
            throw new UnprocessableEntityError('Giá nhập không hợp lệ');
        }

        if (status && !['available', 'out_of_stock'].includes(status)) {
            throw new UnprocessableEntityError('Trạng thái nguyên liệu không hợp lệ');
        }

        if (supplierName !== undefined && typeof supplierName !== 'string') {
            throw new UnprocessableEntityError('Tên nhà cung cấp không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    validateCreateInventory,
    validateUpdateInventory,
};
