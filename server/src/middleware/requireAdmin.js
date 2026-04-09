const prisma = require('../config/prisma');
const { AuthFailureError, ForbiddenError } = require('../core/error.response');

const requireAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            throw new AuthFailureError('Vui lòng đăng nhập');
        }

        const currentUser = await prisma.users.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        if (!currentUser) {
            throw new AuthFailureError('Người dùng không tồn tại');
        }

        if (currentUser.role !== 'admin') {
            throw new ForbiddenError('Ban khong co quyen truy cap chuc nang nay');
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { requireAdmin };
