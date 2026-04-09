const prisma = require('../../config/prisma');
const { BadRequestError, NotFoundError } = require('../../core/error.response');
const { Created, OK } = require('../../core/success.response');
const { normalizeVndAmount } = require('../../utils/money');

const COUPON_SELECT = {
    id: true,
    code: true,
    name: true,
    description: true,
    discount_type: true,
    discount_value: true,
    min_order_value: true,
    max_discount_amount: true,
    usage_limit: true,
    used_count: true,
    starts_at: true,
    expires_at: true,
    status: true,
    created_at: true,
    updated_at: true,
};

function normalizeCoupon(coupon) {
    if (!coupon) return coupon;

    return {
        ...coupon,
        discount_value: Number(coupon.discount_value || 0),
        min_order_value: Number(coupon.min_order_value || 0),
        max_discount_amount:
            coupon.max_discount_amount === null || coupon.max_discount_amount === undefined
                ? null
                : Number(coupon.max_discount_amount),
    };
}

function parseOptionalDateTime(value) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null || value === '') {
        return null;
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestError('Ngày giờ coupon không hợp lệ');
    }

    return parsedDate;
}

function validateCouponDateRange({ startsAt, expiresAt }) {
    const now = new Date();

    if (expiresAt && expiresAt < now) {
        throw new BadRequestError('Ngày hết hạn không được nằm trong quá khứ');
    }

    if (startsAt && expiresAt && startsAt > expiresAt) {
        throw new BadRequestError('Ngày bắt đầu không được sau ngày hết hạn');
    }
}

function calculateDiscount(coupon, subtotal) {
    const subtotalNumber = Number(subtotal || 0);
    const minOrderValue = Number(coupon.min_order_value || 0);

    if (subtotalNumber < minOrderValue) {
        throw new BadRequestError(`Đơn hàng cần tối thiểu ${minOrderValue.toLocaleString('vi-VN')}đ để áp dụng mã này`);
    }

    let discountAmount =
        coupon.discount_type === 'percentage'
            ? (subtotalNumber * Number(coupon.discount_value || 0)) / 100
            : Number(coupon.discount_value || 0);

    if (coupon.max_discount_amount !== null && coupon.max_discount_amount !== undefined) {
        discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount));
    }

    discountAmount = Math.min(discountAmount, subtotalNumber);

    return Math.max(0, Math.round(discountAmount));
}

function validateCouponAvailability(coupon) {
    if (!coupon) {
        throw new NotFoundError('Mã giảm giá không tồn tại');
    }

    if (coupon.status !== 'active') {
        throw new BadRequestError('Mã giảm giá hiện không khả dụng');
    }

    const now = new Date();

    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
        throw new BadRequestError('Mã giảm giá chưa đến thời gian áp dụng');
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
        throw new BadRequestError('Mã giảm giá đã hết hạn');
    }

    if (coupon.usage_limit !== null && coupon.usage_limit !== undefined) {
        if (Number(coupon.used_count || 0) >= Number(coupon.usage_limit)) {
            throw new BadRequestError('Mã giảm giá đã hết lượt sử dụng');
        }
    }
}

async function findCouponByCode(code) {
    return prisma.coupons.findUnique({
        where: { code: String(code || '').trim().toUpperCase() },
        select: COUPON_SELECT,
    });
}

class CouponController {
    async getCoupons(req, res) {
        const coupons = await prisma.coupons.findMany({
            orderBy: { created_at: 'desc' },
            select: COUPON_SELECT,
        });

        return new OK({
            message: 'Lấy danh sách mã giảm giá thành công',
            metadata: coupons.map(normalizeCoupon),
        }).send(res);
    }

    async createCoupon(req, res) {
        const {
            code,
            name,
            description,
            discountType,
            discountValue,
            minOrderValue,
            maxDiscountAmount,
            usageLimit,
            startsAt,
            expiresAt,
            status,
        } = req.body;

        if (!code?.trim() || !name?.trim()) {
            throw new BadRequestError('Vui lòng nhập đầy đủ mã và tên coupon');
        }

        if (!['percentage', 'fixed'].includes(discountType)) {
            throw new BadRequestError('Loại giảm giá không hợp lệ');
        }

        if (Number(discountValue) <= 0) {
            throw new BadRequestError('Giá trị giảm phải lớn hơn 0');
        }

        if (discountType === 'percentage' && Number(discountValue) > 100) {
            throw new BadRequestError('Giảm theo phần trăm không được vượt quá 100%');
        }

        const normalizedDiscountValue =
            discountType === 'fixed' ? normalizeVndAmount(discountValue) : Number(discountValue);
        const normalizedMinOrderValue = normalizeVndAmount(minOrderValue || 0);
        const normalizedMaxDiscountAmount =
            maxDiscountAmount === undefined || maxDiscountAmount === null || maxDiscountAmount === ''
                ? null
                : normalizeVndAmount(maxDiscountAmount);
        const parsedStartsAt = parseOptionalDateTime(startsAt);
        const parsedExpiresAt = parseOptionalDateTime(expiresAt);

        validateCouponDateRange({
            startsAt: parsedStartsAt,
            expiresAt: parsedExpiresAt,
        });

        const createdCoupon = await prisma.coupons.create({
            data: {
                code: code.trim().toUpperCase(),
                name: name.trim(),
                description: description?.trim() || null,
                discount_type: discountType,
                discount_value: normalizedDiscountValue,
                min_order_value: normalizedMinOrderValue ?? 0,
                max_discount_amount: normalizedMaxDiscountAmount,
                usage_limit: usageLimit ? Number(usageLimit) : null,
                starts_at: parsedStartsAt,
                expires_at: parsedExpiresAt,
                status: status === 'inactive' ? 'inactive' : 'active',
            },
            select: COUPON_SELECT,
        });

        return new Created({
            message: 'Tạo mã giảm giá thành công',
            metadata: normalizeCoupon(createdCoupon),
        }).send(res);
    }

    async updateCoupon(req, res) {
        const couponId = Number(req.params.id);

        if (Number.isNaN(couponId)) {
            throw new BadRequestError('ID coupon không hợp lệ');
        }

        const existingCoupon = await prisma.coupons.findUnique({
            where: { id: couponId },
            select: COUPON_SELECT,
        });

        if (!existingCoupon) {
            throw new NotFoundError('Không tìm thấy mã giảm giá');
        }

        const payload = req.body || {};
        const normalizedDiscountValue =
            payload.discountValue === undefined
                ? undefined
                : payload.discountType === 'percentage' || (payload.discountType === undefined && existingCoupon.discount_type === 'percentage')
                  ? Number(payload.discountValue)
                  : normalizeVndAmount(payload.discountValue);
        const normalizedMinOrderValue =
            payload.minOrderValue === undefined ? undefined : normalizeVndAmount(payload.minOrderValue);
        const normalizedMaxDiscountAmount =
            payload.maxDiscountAmount === undefined
                ? undefined
                : payload.maxDiscountAmount
                  ? normalizeVndAmount(payload.maxDiscountAmount)
                  : null;
        const parsedStartsAt = parseOptionalDateTime(payload.startsAt);
        const parsedExpiresAt = parseOptionalDateTime(payload.expiresAt);
        const nextStartsAt =
            parsedStartsAt === undefined
                ? existingCoupon.starts_at
                    ? new Date(existingCoupon.starts_at)
                    : null
                : parsedStartsAt;
        const nextExpiresAt =
            parsedExpiresAt === undefined
                ? existingCoupon.expires_at
                    ? new Date(existingCoupon.expires_at)
                    : null
                : parsedExpiresAt;

        validateCouponDateRange({
            startsAt: nextStartsAt,
            expiresAt: nextExpiresAt,
        });

        const updatedCoupon = await prisma.coupons.update({
            where: { id: couponId },
            data: {
                code: payload.code ? String(payload.code).trim().toUpperCase() : undefined,
                name: payload.name ? String(payload.name).trim() : undefined,
                description:
                    payload.description === undefined ? undefined : String(payload.description || '').trim() || null,
                discount_type: payload.discountType || undefined,
                discount_value: normalizedDiscountValue,
                min_order_value: normalizedMinOrderValue,
                max_discount_amount: normalizedMaxDiscountAmount,
                usage_limit:
                    payload.usageLimit === undefined ? undefined : payload.usageLimit ? Number(payload.usageLimit) : null,
                starts_at: parsedStartsAt,
                expires_at: parsedExpiresAt,
                status: payload.status || undefined,
                updated_at: new Date(),
            },
            select: COUPON_SELECT,
        });

        return new OK({
            message: 'Cập nhật mã giảm giá thành công',
            metadata: normalizeCoupon(updatedCoupon),
        }).send(res);
    }

    async deleteCoupon(req, res) {
        const couponId = Number(req.params.id);

        if (Number.isNaN(couponId)) {
            throw new BadRequestError('ID coupon không hợp lệ');
        }

        const existingCoupon = await prisma.coupons.findUnique({
            where: { id: couponId },
            select: { id: true },
        });

        if (!existingCoupon) {
            throw new NotFoundError('Không tìm thấy mã giảm giá');
        }

        await prisma.coupons.delete({
            where: { id: couponId },
        });

        return new OK({
            message: 'Xóa mã giảm giá thành công',
            metadata: true,
        }).send(res);
    }

    async toggleCouponStatus(req, res) {
        const couponId = Number(req.params.id);

        if (Number.isNaN(couponId)) {
            throw new BadRequestError('ID coupon không hợp lệ');
        }

        const existingCoupon = await prisma.coupons.findUnique({
            where: { id: couponId },
            select: COUPON_SELECT,
        });

        if (!existingCoupon) {
            throw new NotFoundError('Không tìm thấy mã giảm giá');
        }

        const updatedCoupon = await prisma.coupons.update({
            where: { id: couponId },
            data: {
                status: existingCoupon.status === 'active' ? 'inactive' : 'active',
                updated_at: new Date(),
            },
            select: COUPON_SELECT,
        });

        return new OK({
            message: 'Cập nhật trạng thái mã giảm giá thành công',
            metadata: normalizeCoupon(updatedCoupon),
        }).send(res);
    }

    async validateCoupon(req, res) {
        const { code, subtotal } = req.body;

        if (!code?.trim()) {
            throw new BadRequestError('Vui lòng nhập mã giảm giá');
        }

        const coupon = await findCouponByCode(code);
        validateCouponAvailability(coupon);

        const discountAmount = calculateDiscount(coupon, subtotal);

        return new OK({
            message: 'Áp dụng mã giảm giá thành công',
            metadata: {
                coupon: normalizeCoupon(coupon),
                discountAmount,
                finalSubtotal: Math.max(0, Number(subtotal || 0) - discountAmount),
            },
        }).send(res);
    }
}

const couponController = new CouponController();

module.exports = {
    getCoupons: couponController.getCoupons.bind(couponController),
    createCoupon: couponController.createCoupon.bind(couponController),
    updateCoupon: couponController.updateCoupon.bind(couponController),
    deleteCoupon: couponController.deleteCoupon.bind(couponController),
    toggleCouponStatus: couponController.toggleCouponStatus.bind(couponController),
    validateCoupon: couponController.validateCoupon.bind(couponController),
    couponController,
    findCouponByCode,
    validateCouponAvailability,
    calculateDiscount,
    normalizeCoupon,
};
