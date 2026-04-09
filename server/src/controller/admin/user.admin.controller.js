const prisma = require('../../config/prisma');
const { BadRequestError } = require('../../core/error.response');
const { OK } = require('../../core/success.response');

const SAFE_USER_SELECT = {
    id: true,
    name: true,
    email: true,
    phone: true,
    address: true,
    role: true,
    created_at: true,
    updated_at: true,
    facebook_id: true,
    google_id: true,
};

class AdminUserController {
    async getUsers(req, res) {
        const users = await prisma.users.findMany({
            select: SAFE_USER_SELECT,
            orderBy: {
                created_at: 'desc',
            },
        });

        new OK({
            message: 'Lấy danh sách người dùng thành công',
            metadata: users,
        }).send(res);
    }

    async updateUserRole(req, res) {
        const userId = Number(req.params.id);
        const { role } = req.body;

        if (Number.isNaN(userId)) {
            throw new BadRequestError('ID người dùng không hợp lệ');
        }

        const updatedUser = await prisma.users.update({
            where: { id: userId },
            data: { role },
            select: SAFE_USER_SELECT,
        });

        new OK({
            message: 'Cập nhật vai trò người dùng thành công',
            metadata: updatedUser,
        }).send(res);
    }

    async deleteUser(req, res) {
        const userId = Number(req.params.id);

        if (Number.isNaN(userId)) {
            throw new BadRequestError('ID người dùng không hợp lệ');
        }

        if (req.user?.id === userId) {
            throw new BadRequestError('Không thể xóa chính bạn');
        }

        await prisma.users.delete({
            where: { id: userId },
        });

        new OK({
            message: 'Xóa người dùng thành công',
            metadata: true,
        }).send(res);
    }
}

module.exports = new AdminUserController();
