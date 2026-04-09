const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const { requireAdmin } = require('../../middleware/requireAdmin');
const paymentAdminController = require('../../controller/admin/payment.admin.controller');

const router = express.Router();

router.use(authUser, requireAdmin);
router.get('/', asyncHandler(paymentAdminController.getPaymentsAdmin));
router.patch('/:orderId', asyncHandler(paymentAdminController.updatePayment));

module.exports = router;
