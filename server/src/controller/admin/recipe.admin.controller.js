const prisma = require('../../config/prisma');
const { NotFoundError, BadRequestError, ConflictRequestError } = require('../../core/error.response');
const { Created, OK } = require('../../core/success.response');

class RecipeController {
    async getRecipes(req, res) {
        const recipes = await prisma.recipes.findMany({
            select: {
                id: true,
                quantity_used: true,
                created_at: true,
                products: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                    },
                },
                inventory: {
                    select: {
                        id: true,
                        name: true,
                        unit: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        new OK({
            message: 'Lấy công thức thành công',
            metadata: recipes,
        }).send(res);
    }

    async createRecipe(req, res) {
        const { productId, recipes } = req.body;
        const normalizedProductId = Number(productId);

        const normalizedRecipes = recipes.map((recipe) => ({
            inventoryId: Number(recipe.inventoryId),
            quantityUsed: Number(recipe.quantityUsed),
        }));

        const uniqueInventoryIds = new Set(normalizedRecipes.map((recipe) => recipe.inventoryId));

        if (uniqueInventoryIds.size !== normalizedRecipes.length) {
            throw new ConflictRequestError('Một nguyên liệu đang bị lặp trong cùng công thức');
        }

        const product = await prisma.products.findUnique({
            where: { id: normalizedProductId },
            select: { id: true, name: true },
        });

        if (!product) {
            throw new NotFoundError('Sản phẩm không tồn tại');
        }

        const inventoryIds = normalizedRecipes.map((recipe) => recipe.inventoryId);
        const inventoryItems = await prisma.inventory.findMany({
            where: {
                id: {
                    in: inventoryIds,
                },
            },
            select: { id: true },
        });

        if (inventoryItems.length !== inventoryIds.length) {
            throw new NotFoundError('Có nguyên liệu không tồn tại trong kho');
        }

        await prisma.$transaction(async (tx) => {
            await tx.recipes.deleteMany({
                where: {
                    product_id: normalizedProductId,
                },
            });

            await tx.recipes.createMany({
                data: normalizedRecipes.map((recipe) => ({
                    product_id: normalizedProductId,
                    inventory_id: recipe.inventoryId,
                    quantity_used: recipe.quantityUsed,
                })),
            });
        });

        const createdRecipes = await prisma.products.findUnique({
            where: { id: normalizedProductId },
            select: {
                id: true,
                name: true,
                sku: true,
                recipes: {
                    select: {
                        id: true,
                        quantity_used: true,
                        inventory: {
                            select: {
                                id: true,
                                name: true,
                                unit: true,
                            },
                        },
                    },
                },
            },
        });

        new Created({
            message: 'Lưu công thức thành công',
            metadata: createdRecipes,
        }).send(res);
    }

    async updateRecipe(req, res) {
        const { id } = req.params;
        const { quantity_used } = req.body;
        const recipeId = Number(id);
        const quantityUsed = Number(quantity_used);

        if (Number.isNaN(recipeId)) {
            throw new BadRequestError('ID công thức không hợp lệ');
        }

        if (Number.isNaN(quantityUsed) || quantityUsed <= 0) {
            throw new BadRequestError('Số lượng sử dụng không hợp lệ');
        }

        const recipe = await prisma.recipes.findUnique({
            where: { id: recipeId },
        });

        if (!recipe) {
            throw new NotFoundError('Công thức không tồn tại');
        }

        const updatedRecipe = await prisma.recipes.update({
            where: { id: recipeId },
            data: {
                quantity_used: quantityUsed,
            },
            select: {
                id: true,
                quantity_used: true,
                products: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                inventory: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        new OK({
            message: 'Cập nhật công thức thành công',
            metadata: updatedRecipe,
        }).send(res);
    }

    async deleteRecipe(req, res) {
        const { id } = req.params;
        const recipeId = Number(id);

        if (Number.isNaN(recipeId)) {
            throw new BadRequestError('ID công thức không hợp lệ');
        }

        const existingRecipe = await prisma.recipes.findUnique({
            where: { id: recipeId },
        });

        if (!existingRecipe) {
            throw new NotFoundError('Công thức không tồn tại');
        }

        await prisma.recipes.delete({
            where: { id: recipeId },
        });

        new OK({
            message: 'Xóa công thức thành công',
        }).send(res);
    }
}

module.exports = new RecipeController();
