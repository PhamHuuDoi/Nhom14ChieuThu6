const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const couponUserController = require('../../controller/user/coupon.user.controller');
const { validateCouponCode } = require('../../validators/commerce.validator');

const router = express.Router();

router.use(authUser);
router.post('/validate', validateCouponCode, asyncHandler(couponUserController.validateCoupon));

module.exports = router;
