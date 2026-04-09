const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const orderUserController = require('../../controller/user/order.user.controller');
const { validateCheckout } = require('../../validators/commerce.validator');

const router = express.Router();

router.use(authUser);
router.post('/checkout', validateCheckout, asyncHandler(orderUserController.checkout));
router.get('/my-orders', asyncHandler(orderUserController.getMyOrders));
router.get('/:id', asyncHandler(orderUserController.getOrderById));
router.post('/:id/cancel', asyncHandler(orderUserController.cancelOrder));
router.post('/:id/confirm-received', asyncHandler(orderUserController.confirmReceivedOrder));

module.exports = router;
