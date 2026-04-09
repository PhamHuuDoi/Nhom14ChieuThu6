const prisma = require('../../config/prisma');
const { ConflictRequestError, NotFoundError, BadRequestError } = require('../../core/error.response');
const { Created, OK } = require('../../core/success.response');
const { normalizeVndAmount } = require('../../utils/money');

function normalizeInventoryItem(item) {
    if (!item) {
        return item;
    }

    return {
        ...item,
        quantity: Number(item.quantity || 0),
        min_quantity: Number(item.min_quantity || 0),
        cost_price: Number(item.cost_price || 0),
    };
}

class InventoryController {
    async getInventory(req, res) {
        const inventoryItems = await prisma.inventory.findMany({
            select: {
                id: true,
                name: true,
                unit: true,
                quantity: true,
                min_quantity: true,
                cost_price: true,
                supplier_name: true,
                status: true,
                created_at: true,
                updated_at: true,
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        new OK({
            message: 'Lấy kho nguyên liệu thành công',
            metadata: inventoryItems.map(normalizeInventoryItem),
        }).send(res);
    }

    async createInventory(req, res) {
        const { name, unit, quantity, minQuantity, costPrice, supplierName, status } = req.body;
        const normalizedCostPrice = costPrice !== undefined ? normalizeVndAmount(costPrice) : 0;

        const normalizedName = name.trim();
        const normalizedUnit = unit.trim();

        const existingItem = await prisma.inventory.findFirst({
            where: {
                name: normalizedName,
                unit: normalizedUnit,
            },
            select: { id: true },
        });

        if (existingItem) {
            throw new ConflictRequestError('Nguyen lieu nay da ton tai');
        }

        const inventoryItem = await prisma.inventory.create({
            data: {
                name: normalizedName,
                unit: normalizedUnit,
                quantity: quantity !== undefined ? Number(quantity) : 0,
                min_quantity: minQuantity !== undefined ? Number(minQuantity) : 0,
                cost_price: normalizedCostPrice ?? 0,
                supplier_name: supplierName?.trim() || null,
                status: status || 'available',
            },
            select: {
                id: true,
                name: true,
                unit: true,
                quantity: true,
                min_quantity: true,
                cost_price: true,
                supplier_name: true,
                status: true,
                created_at: true,
                updated_at: true,
            },
        });

        new Created({
            message: 'Tạo nguyên liệu thành công',
            metadata: normalizeInventoryItem(inventoryItem),
        }).send(res);
    }

    async updateInventory(req, res) {
        const { id } = req.params;
        const { name, unit, quantity, minQuantity, costPrice, supplierName, status } = req.body;
        const inventoryId = Number(id);
        const normalizedCostPrice = costPrice !== undefined ? normalizeVndAmount(costPrice) : null;

        if (Number.isNaN(inventoryId)) {
            throw new BadRequestError('ID nguyên liệu không hợp lệ');
        }

        const existingItem = await prisma.inventory.findUnique({
            where: { id: inventoryId },
        });

        if (!existingItem) {
            throw new NotFoundError('Nguyên liệu không tồn tại');
        }

        const normalizedName = name ? name.trim() : existingItem.name;
        const normalizedUnit = unit ? unit.trim() : existingItem.unit;

        if (normalizedName !== existingItem.name || normalizedUnit !== existingItem.unit) {
            const nameUnitConflict = await prisma.inventory.findFirst({
                where: {
                    name: normalizedName,
                    unit: normalizedUnit,
                },
            });
            if (nameUnitConflict && nameUnitConflict.id !== inventoryId) {
                throw new ConflictRequestError('Ket hop ten va don vi da ton tai');
            }
        }

        const updatedItem = await prisma.inventory.update({
            where: { id: inventoryId },
            data: {
                name: normalizedName,
                unit: normalizedUnit,
                quantity: quantity !== undefined ? Number(quantity) : existingItem.quantity,
                min_quantity: minQuantity !== undefined ? Number(minQuantity) : existingItem.min_quantity,
                cost_price: costPrice !== undefined ? normalizedCostPrice : existingItem.cost_price,
                supplier_name: supplierName !== undefined ? supplierName.trim() || null : existingItem.supplier_name,
                status: status || existingItem.status,
                updated_at: new Date(),
            },
            select: {
                id: true,
                name: true,
                unit: true,
                quantity: true,
                min_quantity: true,
                cost_price: true,
                supplier_name: true,
                status: true,
                created_at: true,
                updated_at: true,
            },
        });

        new OK({
            message: 'Cập nhật nguyên liệu thành công',
            metadata: normalizeInventoryItem(updatedItem),
        }).send(res);
    }

    async toggleInventoryStatus(req, res) {
        const { id } = req.params;
        const inventoryId = Number(id);

        if (Number.isNaN(inventoryId)) {
            throw new BadRequestError('ID nguyên liệu không hợp lệ');
        }

        const existingItem = await prisma.inventory.findUnique({
            where: { id: inventoryId },
        });

        if (!existingItem) {
            throw new NotFoundError('Nguyên liệu không tồn tại');
        }

        const newStatus = existingItem.status === 'available' ? 'out_of_stock' : 'available';

        const updatedItem = await prisma.inventory.update({
            where: { id: inventoryId },
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
            message: 'Chuyển trạng thái nguyên liệu thành công',
            metadata: updatedItem,
        }).send(res);
    }

    async deleteInventory(req, res) {
        const { id } = req.params;
        const inventoryId = Number(id);

        if (Number.isNaN(inventoryId)) {
            throw new BadRequestError('ID nguyên liệu không hợp lệ');
        }

        const existingItem = await prisma.inventory.findUnique({
            where: { id: inventoryId },
        });

        if (!existingItem) {
            throw new NotFoundError('Nguyên liệu không tồn tại');
        }

        const usageCount = await prisma.recipes.count({
            where: { inventory_id: inventoryId },
        });

        const transactionCount = await prisma.inventory_transactions.count({
            where: { inventory_id: inventoryId },
        });

        if (usageCount > 0 || transactionCount > 0) {
            throw new BadRequestError('Không thể xóa nguyên liệu đang được sử dụng trong công thức hoặc giao dịch');
        }

        await prisma.inventory.delete({
            where: { id: inventoryId },
        });

        new OK({
            message: 'Xóa nguyên liệu thành công',
        }).send(res);
    }
}

module.exports = new InventoryController();
