const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const { requireAdmin } = require('../../middleware/requireAdmin');
const productAdminController = require('../../controller/admin/product.admin.controller');
const { validateCreateProduct, validateUpdateProduct } = require('../../validators/catalog.validator');
const { validateCreateProductWithRecipes } = require('../../validators/recipe.validator');

const router = express.Router();

router.use(authUser, requireAdmin);
router.get('/', asyncHandler(productAdminController.getProducts));
router.post('/', validateCreateProduct, asyncHandler(productAdminController.createProduct));
router.post('/with-recipes', validateCreateProductWithRecipes, asyncHandler(productAdminController.createProductWithRecipes));
router.put('/:id', validateUpdateProduct, asyncHandler(productAdminController.updateProduct));
router.patch('/:id/status', asyncHandler(productAdminController.toggleProductStatus));
router.delete('/:id', asyncHandler(productAdminController.deleteProduct));

module.exports = router;
