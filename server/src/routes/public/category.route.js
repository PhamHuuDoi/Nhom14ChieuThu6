const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const { requireAdmin } = require('../../middleware/requireAdmin');
const categoryController = require('../../controller/public/category.controller');
const { validateCreateCategory, validateUpdateCategory } = require('../../validators/catalog.validator');

const router = express.Router();

router.get('/', asyncHandler(categoryController.getCategories));

router.get('/:id', asyncHandler(categoryController.getCategory));

module.exports = router;
