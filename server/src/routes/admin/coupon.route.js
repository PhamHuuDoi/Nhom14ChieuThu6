const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const { requireAdmin } = require('../../middleware/requireAdmin');
const couponAdminController = require('../../controller/admin/coupon.admin.controller');

const router = express.Router();

router.use(authUser, requireAdmin);
router.get('/', asyncHandler(couponAdminController.getCoupons));
router.post('/', asyncHandler(couponAdminController.createCoupon));
router.put('/:id', asyncHandler(couponAdminController.updateCoupon));
router.patch('/:id/status', asyncHandler(couponAdminController.toggleCouponStatus));
router.delete('/:id', asyncHandler(couponAdminController.deleteCoupon));

module.exports = router;
