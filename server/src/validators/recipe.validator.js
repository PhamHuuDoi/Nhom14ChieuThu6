'use strict';

const { BadRequestError, UnprocessableEntityError } = require('../core/error.response');

const validateCreateProductWithRecipes = (req, res, next) => {
    try {
        const { name, categoryId, price, recipes } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            throw new BadRequestError('Tên sản phẩm là bắt buộc');
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

        if (!Array.isArray(recipes) || recipes.length === 0) {
            throw new BadRequestError('Cần ít nhất một nguyên liệu cho công thức');
        }

        for (const recipe of recipes) {
            if (
                recipe.inventoryId === undefined ||
                recipe.inventoryId === null ||
                Number.isNaN(Number(recipe.inventoryId))
            ) {
                throw new BadRequestError('Nguyên liệu không hợp lệ');
            }

            if (
                recipe.quantityUsed === undefined ||
                recipe.quantityUsed === null ||
                Number.isNaN(Number(recipe.quantityUsed))
            ) {
                throw new BadRequestError('Số lượng nguyên liệu là bắt buộc');
            }

            if (Number(recipe.quantityUsed) <= 0) {
                throw new UnprocessableEntityError('Số lượng nguyên liệu phải lớn hơn 0');
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validateCreateRecipe = (req, res, next) => {
    try {
        const { productId, recipes } = req.body;

        if (productId === undefined || productId === null || Number.isNaN(Number(productId))) {
            throw new BadRequestError('Sản phẩm là bắt buộc');
        }

        if (!Array.isArray(recipes) || recipes.length === 0) {
            throw new BadRequestError('Cần ít nhất một nguyên liệu cho công thức');
        }

        for (const recipe of recipes) {
            if (
                recipe.inventoryId === undefined ||
                recipe.inventoryId === null ||
                Number.isNaN(Number(recipe.inventoryId))
            ) {
                throw new BadRequestError('Nguyên liệu không hợp lệ');
            }

            if (
                recipe.quantityUsed === undefined ||
                recipe.quantityUsed === null ||
                Number.isNaN(Number(recipe.quantityUsed))
            ) {
                throw new BadRequestError('Số lượng nguyên liệu là bắt buộc');
            }

            if (Number(recipe.quantityUsed) <= 0) {
                throw new UnprocessableEntityError('Số lượng nguyên liệu phải lớn hơn 0');
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};

const validateUpdateRecipe = (req, res, next) => {
    try {
        const { quantity_used } = req.body;

        if (quantity_used === undefined || Number.isNaN(Number(quantity_used)) || Number(quantity_used) <= 0) {
            throw new BadRequestError('Số lượng sử dụng không hợp lệ');
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    validateCreateProductWithRecipes,
    validateCreateRecipe,
    validateUpdateRecipe,
};
