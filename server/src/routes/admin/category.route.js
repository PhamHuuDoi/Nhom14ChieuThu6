const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const { requireAdmin } = require('../../middleware/requireAdmin');
const categoryAdminController = require('../../controller/admin/category.admin.controller');
const { validateCreateCategory, validateUpdateCategory } = require('../../validators/catalog.validator');

const router = express.Router();

router.use(authUser, requireAdmin);
router.get('/', asyncHandler(categoryAdminController.getCategories));
router.get('/:id', asyncHandler(categoryAdminController.getCategory));
router.post('/', validateCreateCategory, asyncHandler(categoryAdminController.createCategory));
router.put('/:id', validateUpdateCategory, asyncHandler(categoryAdminController.updateCategory));
router.patch('/:id/status', asyncHandler(categoryAdminController.toggleCategoryStatus));
router.delete('/:id', asyncHandler(categoryAdminController.deleteCategory));

module.exports = router;
