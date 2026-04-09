const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const { requireAdmin } = require('../../middleware/requireAdmin');
const notificationAdminController = require('../../controller/admin/notification.admin.controller');

const router = express.Router();

router.use(authUser, requireAdmin);
router.get('/', asyncHandler(notificationAdminController.getNotifications));
router.delete('/', asyncHandler(notificationAdminController.clearNotifications));
router.patch('/read-all', asyncHandler(notificationAdminController.markAllAsRead));
router.patch('/:id/read', asyncHandler(notificationAdminController.markAsRead));
router.delete('/:id', asyncHandler(notificationAdminController.deleteNotification));

module.exports = router;
