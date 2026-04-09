const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const { requireAdmin } = require('../../middleware/requireAdmin');
const { uploadImage } = require('../../middleware/uploadImage');
const uploadAdminController = require('../../controller/admin/upload.admin.controller');

const router = express.Router();

router.use(authUser, requireAdmin);
router.post('/image', uploadImage.single('image'), asyncHandler(uploadAdminController.uploadProductImage));

module.exports = router;
