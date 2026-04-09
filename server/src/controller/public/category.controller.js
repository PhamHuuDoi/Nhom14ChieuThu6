const prisma = require('../../config/prisma');
const { ConflictRequestError, NotFoundError, BadRequestError } = require('../../core/error.response');
const { Created, OK } = require('../../core/success.response');

class CategoryController {
    async getCategories(req, res) {
        const categories = await prisma.categories.findMany({
            select: {
                id: true,
                name: true,
                status: true,
                created_at: true,
                updated_at: true,
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        new OK({
            message: 'Lấy danh mục thành công',
            metadata: categories,
        }).send(res);
    }

    async getCategory(req, res) {
        const { id } = req.params;
        const categoryId = Number(id);

        if (Number.isNaN(categoryId)) {
            throw new BadRequestError('ID danh mục không hợp lệ');
        }

        const category = await prisma.categories.findUnique({
            where: { id: categoryId },
            select: {
                id: true,
                name: true,
                status: true,
                created_at: true,
                updated_at: true,
            },
        });

        if (!category) {
            throw new NotFoundError('Danh mục không tồn tại');
        }

        new OK({
            message: 'Lấy danh mục thành công',
            metadata: category,
        }).send(res);
    }

    async createCategory(req, res) {
        const { name, status } = req.body;
        const normalizedName = name.trim();

        const existingCategory = await prisma.categories.findUnique({
            where: { name: normalizedName },
        });

        if (existingCategory) {
            throw new ConflictRequestError('Danh muc da ton tai');
        }

        const category = await prisma.categories.create({
            data: {
                name: normalizedName,
                status: status || 'active',
            },
            select: {
                id: true,
                name: true,
                status: true,
                created_at: true,
                updated_at: true,
            },
        });

        new Created({
            message: 'Tạo danh mục thành công',
            metadata: category,
        }).send(res);
    }

    async updateCategory(req, res) {
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

        if (name && name.trim() !== existingCategory.name) {
            const normalizedName = name.trim();
            const nameConflict = await prisma.categories.findUnique({
                where: { name: normalizedName },
            });
            if (nameConflict) {
                throw new ConflictRequestError('Tên danh mục đã tồn tại');
            }
        }

        const updatedCategory = await prisma.categories.update({
            where: { id: categoryId },
            data: {
                name: name ? name.trim() : existingCategory.name,
                status: status || existingCategory.status,
                updated_at: new Date(),
            },
            select: {
                id: true,
                name: true,
                status: true,
                created_at: true,
                updated_at: true,
            },
        });

        new OK({
            message: 'Cập nhật danh mục thành công',
            metadata: updatedCategory,
        }).send(res);
    }

    async toggleCategoryStatus(req, res) {
        const { id } = req.params;
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

        const newStatus = existingCategory.status === 'active' ? 'inactive' : 'active';

        const updatedCategory = await prisma.categories.update({
            where: { id: categoryId },
            data: {
                status: newStatus,
            },
            select: {
                id: true,
                name: true,
                status: true,
            },
        });

        new OK({
            message: 'Chuyển trạng thái danh mục thành công',
            metadata: updatedCategory,
        }).send(res);
    }

    async deleteCategory(req, res) {
        const { id } = req.params;
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

        const productCount = await prisma.products.count({
            where: { category_id: categoryId },
        });

        if (productCount > 0) {
            throw new BadRequestError('Không thể xóa danh mục có sản phẩm liên kết');
        }

        await prisma.categories.delete({
            where: { id: categoryId },
        });

        new OK({
            message: 'Xóa danh mục thành công',
        }).send(res);
    }
}

module.exports = new CategoryController();
