'use strict';

const prisma = require('../config/prisma');
const { BadRequestError, UnprocessableEntityError, NotFoundError } = require('../core/error.response');

const validateCreateCategory = (req, res, next) => {
    try {
        const { name, status } = req.body;

        if (!name || typeof name !== 'string') {
            throw new BadRequestError('Tên danh mục là bắt buộc');
        }

        const cleanName = name.trim();

        if (cleanName.length < 2) {
            throw new BadRequestError('Tên danh mục quá ngắn');
        }

        if (cleanName.length > 100) {
            throw new BadRequestError('Tên danh mục quá dài');
        }

        if (status && !['active', 'inactive'].includes(status)) {
            throw new UnprocessableEntityError('Trạng thái danh mục không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validateCreateProduct = (req, res, next) => {
    try {
        const { name, categoryId, price, image, description, sku, status } = req.body;

        if (!name || typeof name !== 'string') {
            throw new BadRequestError('Tên sản phẩm là bắt buộc');
        }

        if (name.trim().length < 2 || name.trim().length > 150) {
            throw new BadRequestError('Tên sản phẩm phải từ 2 đến 150 ký tự');
        }

        if (categoryId === undefined || categoryId === null || Number.isNaN(Number(categoryId))) {
            throw new BadRequestError('Danh mục sản phẩm là bắt buộc');
        }

        if (price === undefined || price === null || Number.isNaN(Number(price))) {
            throw new BadRequestError('Giá sản phẩm là bắt buộc');
        }

        if (Number(price) <= 0) {
            throw new UnprocessableEntityError('Giá sản phẩm phải lớn hơn 0');
        }

        if (image && typeof image !== 'string') {
            throw new UnprocessableEntityError('Ảnh sản phẩm không hợp lệ');
        }

        if (description && typeof description !== 'string') {
            throw new UnprocessableEntityError('Mô tả sản phẩm không hợp lệ');
        }

        if (sku && typeof sku !== 'string') {
            throw new UnprocessableEntityError('SKU không hợp lệ');
        }

        if (status && !['available', 'out_of_stock', 'discontinued'].includes(status)) {
            throw new UnprocessableEntityError('Trạng thái sản phẩm không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validateUpdateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, status } = req.body;
        const categoryId = Number(id);

        if (Number.isNaN(categoryId)) {
            throw new BadRequestError('ID danh mục không hợp lệ');
        }

        const existingCategory = await prisma.categories.findUnique({
            where: { id: categoryId },
        });

        if (!existingCategory) {
            throw new NotFoundError('Danh mục không tồn tại');
        }

        if (name && typeof name !== 'string') {
            throw new BadRequestError('Tên danh mục không hợp lệ');
        }

        const cleanName = name ? name.trim() : '';
        if (cleanName.length > 0 && (cleanName.length < 2 || cleanName.length > 100)) {
            throw new BadRequestError('Tên danh mục phải từ 2 đến 100 ký tự');
        }

        if (status && !['active', 'inactive'].includes(status)) {
            throw new UnprocessableEntityError('Trạng thái danh mục không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validateUpdateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const productId = Number(id);

        if (Number.isNaN(productId)) {
            throw new BadRequestError('ID sản phẩm không hợp lệ');
        }

        const existingProduct = await prisma.products.findUnique({
            where: { id: productId },
        });

        if (!existingProduct) {
            throw new NotFoundError('Sản phẩm không tồn tại');
        }

        const { name, categoryId, price, image, description, sku, status } = req.body;

        if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 150)) {
            throw new BadRequestError('Tên sản phẩm phải từ 2 đến 150 ký tự');
        }

        if (categoryId !== undefined && (Number.isNaN(Number(categoryId)) || Number(categoryId) <= 0)) {
            throw new BadRequestError('Danh mục không hợp lệ');
        }

        if (price !== undefined && (Number.isNaN(Number(price)) || Number(price) <= 0)) {
            throw new UnprocessableEntityError('Giá sản phẩm phải lớn hơn 0');
        }

        if (image !== undefined && typeof image !== 'string') {
            throw new UnprocessableEntityError('Ảnh sản phẩm không hợp lệ');
        }

        if (description !== undefined && typeof description !== 'string') {
            throw new UnprocessableEntityError('Mô tả không hợp lệ');
        }

        if (sku !== undefined && typeof sku !== 'string') {
            throw new UnprocessableEntityError('SKU không hợp lệ');
        }

        if (status && !['available', 'out_of_stock', 'discontinued'].includes(status)) {
            throw new UnprocessableEntityError('Trạng thái sản phẩm không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    validateCreateCategory,
    validateCreateProduct,
    validateUpdateCategory,
    validateUpdateProduct,
};
