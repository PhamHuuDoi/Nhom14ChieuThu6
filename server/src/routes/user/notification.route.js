const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const notificationUserController = require('../../controller/user/notification.user.controller');

const router = express.Router();

router.use(authUser);
router.get('/', asyncHandler(notificationUserController.getMyNotifications));
router.delete('/', asyncHandler(notificationUserController.clearNotifications));
router.patch('/read-all', asyncHandler(notificationUserController.markAllAsRead));
router.patch('/:id/read', asyncHandler(notificationUserController.markAsRead));
router.delete('/:id', asyncHandler(notificationUserController.deleteNotification));

module.exports = router;
