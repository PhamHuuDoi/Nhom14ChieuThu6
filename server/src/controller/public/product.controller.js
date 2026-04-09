const prisma = require('../../config/prisma');
const { ConflictRequestError, NotFoundError, BadRequestError } = require('../../core/error.response');
const { Created, OK } = require('../../core/success.response');
const { normalizeVndAmount } = require('../../utils/money');

function normalizeProduct(product) {
    if (!product) {
        return product;
    }

    return {
        ...product,
        price: Number(product.price || 0),
        recipes: product.recipes
            ? product.recipes.map((recipe) => ({
                  ...recipe,
                  quantity_used: Number(recipe.quantity_used || 0),
              }))
            : product.recipes,
    };
}

async function getProductSalesStats(productIds) {
    if (!productIds.length) {
        return {
            soldCountMap: new Map(),
            bestSellerIds: new Set(),
        };
    }

    const sales = await prisma.order_items.groupBy({
        by: ['product_id'],
        where: {
            product_id: {
                in: productIds,
            },
            orders: {
                order_status: {
                    not: 'cancelled',
                },
                OR: [{ order_status: 'completed' }, { payment_status: 'paid' }],
            },
        },
        _sum: {
            quantity: true,
        },
        orderBy: {
            _sum: {
                quantity: 'desc',
            },
        },
    });

    const soldCountMap = new Map(sales.map((item) => [item.product_id, Number(item._sum.quantity || 0)]));
    const bestSellerIds = new Set(
        sales
            .filter((item) => Number(item._sum.quantity || 0) > 0)
            .slice(0, 4)
            .map((item) => item.product_id),
    );

    return {
        soldCountMap,
        bestSellerIds,
    };
}

function attachProductSales(products, soldCountMap, bestSellerIds) {
    return products.map((product) => ({
        ...normalizeProduct(product),
        sold_count: soldCountMap.get(product.id) || 0,
        is_best_seller: bestSellerIds.has(product.id),
    }));
}

class ProductController {
    async getProducts(req, res) {
        const { page = 1, limit = 10, sort = 'newest', search } = req.query;

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        const shouldSortByPopularity = sort === 'popular';

        let orderBy = { created_at: 'desc' };
        if (sort === 'price_asc') {
            orderBy = { price: 'asc' };
        } else if (sort === 'price_desc') {
            orderBy = { price: 'desc' };
        }

        const where = {
            status: 'available',
            categories: {
                is: {
                    status: 'active',
                },
            },
            ...(search
                ? {
                      OR: [
                          {
                              name: {
                                  contains: search,
                                  mode: 'insensitive',
                              },
                          },
                          {
                              description: {
                                  contains: search,
                                  mode: 'insensitive',
                              },
                          },
                      ],
                  }
                : {}),
        };

        const [products, total, allProductIds] = await Promise.all([
            prisma.products.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    price: true,
                    image: true,
                    description: true,
                    sku: true,
                    status: true,
                    created_at: true,
                    updated_at: true,
                    categories: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
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
                orderBy,
                ...(shouldSortByPopularity ? {} : { skip: offset, take: limitNum }),
            }),
            prisma.products.count({ where }),
            prisma.products.findMany({
                where,
                select: {
                    id: true,
                },
            }),
        ]);

        const { soldCountMap, bestSellerIds } = await getProductSalesStats(allProductIds.map((product) => product.id));
        const productsWithSales = attachProductSales(products, soldCountMap, bestSellerIds);

        if (shouldSortByPopularity) {
            productsWithSales.sort((first, second) => {
                if (second.sold_count !== first.sold_count) {
                    return second.sold_count - first.sold_count;
                }

                return new Date(second.created_at || 0).getTime() - new Date(first.created_at || 0).getTime();
            });
        }

        const paginatedProducts = shouldSortByPopularity
            ? productsWithSales.slice(offset, offset + limitNum)
            : productsWithSales;

        new OK({
            message: 'Lấy sản phẩm thành công',
            metadata: {
                products: paginatedProducts,
                total,
                page: pageNum,
                limit: limitNum,
            },
        }).send(res);
    }

    async getProductsByCategory(req, res) {
        const { category } = req.params;
        const { page = 1, limit = 10, sort = 'newest' } = req.query;

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        const shouldSortByPopularity = sort === 'popular';

        let orderBy = { created_at: 'desc' };
        if (sort === 'price_asc') {
            orderBy = { price: 'asc' };
        } else if (sort === 'price_desc') {
            orderBy = { price: 'desc' };
        }

        const where = {
            status: 'available',
            categories: {
                is: {
                    name: category,
                    status: 'active',
                },
            },
        };

        const [products, total, allProductIds] = await Promise.all([
            prisma.products.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    price: true,
                    image: true,
                    description: true,
                    sku: true,
                    status: true,
                    created_at: true,
                    updated_at: true,
                    categories: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
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
                orderBy,
                ...(shouldSortByPopularity ? {} : { skip: offset, take: limitNum }),
            }),
            prisma.products.count({ where }),
            prisma.products.findMany({
                where,
                select: {
                    id: true,
                },
            }),
        ]);

        const { soldCountMap, bestSellerIds } = await getProductSalesStats(allProductIds.map((product) => product.id));
        const productsWithSales = attachProductSales(products, soldCountMap, bestSellerIds);

        if (shouldSortByPopularity) {
            productsWithSales.sort((first, second) => {
                if (second.sold_count !== first.sold_count) {
                    return second.sold_count - first.sold_count;
                }

                return new Date(second.created_at || 0).getTime() - new Date(first.created_at || 0).getTime();
            });
        }

        const paginatedProducts = shouldSortByPopularity
            ? productsWithSales.slice(offset, offset + limitNum)
            : productsWithSales;

        new OK({
            message: 'Lấy sản phẩm theo danh mục thành công',
            metadata: {
                products: paginatedProducts,
                total,
                page: pageNum,
                limit: limitNum,
            },
        }).send(res);
    }


    async getProductById(req, res) {
        const productId = Number(req.params.id);

        if (Number.isNaN(productId)) {
            throw new BadRequestError('ID s?n ph?m kh?ng h?p l?');
        }

        const product = await prisma.products.findFirst({
            where: {
                id: productId,
                status: 'available',
                categories: {
                    is: {
                        status: 'active',
                    },
                },
            },
            select: {
                id: true,
                name: true,
                price: true,
                image: true,
                description: true,
                sku: true,
                status: true,
                created_at: true,
                updated_at: true,
                categories: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
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

        if (!product) {
            throw new NotFoundError('S?n ph?m kh?ng t?n t?i');
        }

        const { soldCountMap, bestSellerIds } = await getProductSalesStats([product.id]);
        const [normalizedProduct] = attachProductSales([product], soldCountMap, bestSellerIds);

        new OK({
            message: 'L?y chi ti?t s?n ph?m th?nh c?ng',
            metadata: normalizedProduct,
        }).send(res);
    }

    async createProduct(req, res) {
        const { name, categoryId, price, image, description, sku, status } = req.body;
        const normalizedPrice = normalizeVndAmount(price);

        if (normalizedPrice === null || normalizedPrice <= 0) {
            throw new BadRequestError('Giá sản phẩm không hợp lệ');
        }

        const category = await prisma.categories.findUnique({
            where: { id: Number(categoryId) },
            select: { id: true, name: true },
        });

        if (!category) {
            throw new NotFoundError('Danh mục không tồn tại');
        }

        const existingNameInCategory = await prisma.products.findFirst({
            where: {
                name: name.trim(),
                category_id: Number(categoryId),
            },
            select: { id: true },
        });

        if (existingNameInCategory) {
            throw new ConflictRequestError('Tên sản phẩm đã tồn tại trong danh mục này');
        }

        if (sku?.trim()) {
            const existingProduct = await prisma.products.findUnique({
                where: { sku: sku.trim() },
                select: { id: true },
            });

            if (existingProduct) {
                throw new ConflictRequestError('SKU đã tồn tại');
            }
        }

        const product = await prisma.products.create({
            data: {
                name: name.trim(),
                category_id: Number(categoryId),
                price: normalizedPrice,
                image: image?.trim() || null,
                description: description?.trim() || null,
                sku: sku?.trim() || null,
                status: status || 'available',
            },
            select: {
                id: true,
                name: true,
                price: true,
                image: true,
                description: true,
                sku: true,
                status: true,
                created_at: true,
                updated_at: true,
                categories: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        new Created({
            message: 'Tạo sản phẩm thành công',
            metadata: normalizeProduct(product),
        }).send(res);
    }

    async createProductWithRecipes(req, res) {
        const { name, categoryId, price, image, description, sku, status, recipes } = req.body;
        const normalizedPrice = normalizeVndAmount(price);

        if (normalizedPrice === null || normalizedPrice <= 0) {
            throw new BadRequestError('Giá sản phẩm không hợp lệ');
        }

        const category = await prisma.categories.findUnique({
            where: { id: Number(categoryId) },
            select: { id: true },
        });

        if (!category) {
            throw new NotFoundError('Danh mục không tồn tại');
        }

        const existingNameInCategory = await prisma.products.findFirst({
            where: {
                name: name.trim(),
                category_id: Number(categoryId),
            },
            select: { id: true },
        });

        if (existingNameInCategory) {
            throw new ConflictRequestError('Tên sản phẩm đã tồn tại trong danh mục này');
        }

        if (sku?.trim()) {
            const existingProduct = await prisma.products.findUnique({
                where: { sku: sku.trim() },
                select: { id: true },
            });

            if (existingProduct) {
                throw new ConflictRequestError('SKU đã tồn tại');
            }
        }

        const inventoryIds = recipes.map((recipe) => Number(recipe.inventoryId));
        const inventoryItems = await prisma.inventory.findMany({
            where: {
                id: {
                    in: inventoryIds,
                },
            },
            select: {
                id: true,
                name: true,
                unit: true,
            },
        });

        if (inventoryItems.length !== inventoryIds.length) {
            throw new NotFoundError('Có nguyên liệu không tồn tại trong kho');
        }

        const createdProduct = await prisma.$transaction(async (tx) => {
            const product = await tx.products.create({
                data: {
                    name: name.trim(),
                    category_id: Number(categoryId),
                    price: normalizedPrice,
                    image: image?.trim() || null,
                    description: description?.trim() || null,
                    sku: sku?.trim() || null,
                    status: status || 'available',
                },
            });

            await tx.recipes.createMany({
                data: recipes.map((recipe) => ({
                    product_id: product.id,
                    inventory_id: Number(recipe.inventoryId),
                    quantity_used: Number(recipe.quantityUsed),
                })),
            });

            return tx.products.findUnique({
                where: { id: product.id },
                select: {
                    id: true,
                    name: true,
                    price: true,
                    image: true,
                    description: true,
                    sku: true,
                    status: true,
                    created_at: true,
                    updated_at: true,
                    categories: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
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
        });

        new Created({
            message: 'Tạo sản phẩm theo công thức thành công',
            metadata: normalizeProduct(createdProduct),
        }).send(res);
    }

    async updateProduct(req, res) {
        const { id } = req.params;
        const { name, categoryId, price, image, description, sku, status } = req.body;
        const productId = Number(id);
        const normalizedPrice = price !== undefined ? normalizeVndAmount(price) : null;

        if (Number.isNaN(productId)) {
            throw new BadRequestError('ID sản phẩm không hợp lệ');
        }

        if (price !== undefined && (normalizedPrice === null || normalizedPrice <= 0)) {
            throw new BadRequestError('Giá sản phẩm không hợp lệ');
        }

        const existingProduct = await prisma.products.findUnique({
            where: { id: productId },
        });

        if (!existingProduct) {
            throw new NotFoundError('Sản phẩm không tồn tại');
        }

        if (categoryId && Number(categoryId) !== existingProduct.category_id) {
            const category = await prisma.categories.findUnique({
                where: { id: Number(categoryId) },
            });
            if (!category) {
                throw new NotFoundError('Danh mục không tồn tại');
            }
        }

        const targetName = name ? name.trim() : existingProduct.name;
        const targetCategoryId = categoryId ? Number(categoryId) : existingProduct.category_id;

        if (targetCategoryId) {
            const nameConflict = await prisma.products.findFirst({
                where: {
                    name: targetName,
                    category_id: targetCategoryId,
                },
                select: { id: true },
            });

            if (nameConflict && nameConflict.id !== productId) {
                throw new ConflictRequestError('Tên sản phẩm đã tồn tại trong danh mục này');
            }
        }

        if (sku && sku.trim() && sku.trim() !== existingProduct.sku) {
            const skuConflict = await prisma.products.findUnique({
                where: { sku: sku.trim() },
            });
            if (skuConflict) {
                throw new ConflictRequestError('SKU đã tồn tại');
            }
        }

        const updatedProduct = await prisma.products.update({
            where: { id: productId },
            data: {
                name: name ? name.trim() : existingProduct.name,
                category_id: categoryId ? Number(categoryId) : existingProduct.category_id,
                price: price !== undefined ? normalizedPrice : existingProduct.price,
                image: image !== undefined ? (image ? image.trim() : null) : existingProduct.image,
                description: description !== undefined ? description.trim() || null : existingProduct.description,
                sku: sku ? sku.trim() : existingProduct.sku,
                status: status || existingProduct.status,
                updated_at: new Date(),
            },
            select: {
                id: true,
                name: true,
                price: true,
                image: true,
                description: true,
                sku: true,
                status: true,
                created_at: true,
                updated_at: true,
                categories: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        new OK({
            message: 'Cập nhật sản phẩm thành công',
            metadata: normalizeProduct(updatedProduct),
        }).send(res);
    }

    async toggleProductStatus(req, res) {
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

        const statusMap = {
            available: 'out_of_stock',
            out_of_stock: 'discontinued',
            discontinued: 'available',
        };

        const newStatus = statusMap[existingProduct.status] || 'available';

        const updatedProduct = await prisma.products.update({
            where: { id: productId },
            data: { status: newStatus },
            select: {
                id: true,
                name: true,
                status: true,
            },
        });

        new OK({
            message: 'Chuyển trạng thái sản phẩm thành công',
            metadata: updatedProduct,
        }).send(res);
    }

    async deleteProduct(req, res) {
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

        const orderCount = await prisma.order_items.count({
            where: {
                product_id: productId,
                orders: {
                    order_status: {
                        in: ['confirmed', 'preparing', 'shipping'],
                    },
                },
            },
        });

        if (orderCount > 0) {
            throw new BadRequestError('Không thể xóa sản phẩm đang được sử dụng trong đơn hàng/giỏ hàng/công thức');
        }

        await prisma.$transaction(async (tx) => {
            await tx.cart_items.deleteMany({
                where: { product_id: productId },
            });

            await tx.recipes.deleteMany({
                where: { product_id: productId },
            });

            await tx.products.delete({
                where: { id: productId },
            });
        });

        new OK({
            message: 'Xóa sản phẩm thành công',
        }).send(res);
    }
}

module.exports = new ProductController();
