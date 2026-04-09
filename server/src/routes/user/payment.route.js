const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const paymentUserController = require('../../controller/user/payment.user.controller');
const { validateCreatePayment } = require('../../validators/commerce.validator');

const router = express.Router();

router.use(authUser);
router.post('/:orderId/initiate', validateCreatePayment, asyncHandler(paymentUserController.createPayment));
router.get('/:orderId', asyncHandler(paymentUserController.getPaymentById));

module.exports = router;
