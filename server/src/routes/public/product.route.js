const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const { requireAdmin } = require('../../middleware/requireAdmin');
const productController = require('../../controller/public/product.controller');
const { validateCreateProduct, validateUpdateProduct } = require('../../validators/catalog.validator');

const { validateCreateProductWithRecipes } = require('../../validators/recipe.validator');

const router = express.Router();

router.get('/', asyncHandler(productController.getProducts));

router.get('/category/:category', asyncHandler(productController.getProductsByCategory));
router.get('/:id', asyncHandler(productController.getProductById));

module.exports = router;
