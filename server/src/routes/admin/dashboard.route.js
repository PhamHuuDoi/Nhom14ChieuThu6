const express = require('express');
const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const { requireAdmin } = require('../../middleware/requireAdmin');
const dashboardAdminController = require('../../controller/admin/dashboard.admin.controller');

const router = express.Router();

router.use(authUser, requireAdmin);
router.get('/', asyncHandler(dashboardAdminController.getDashboard));

module.exports = router;
