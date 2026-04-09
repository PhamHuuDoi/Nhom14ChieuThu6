const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const { requireAdmin } = require('../../middleware/requireAdmin');
const recipeAdminController = require('../../controller/admin/recipe.admin.controller');
const { validateCreateRecipe, validateUpdateRecipe } = require('../../validators/recipe.validator');

const router = express.Router();

router.use(authUser, requireAdmin);
router.get('/', asyncHandler(recipeAdminController.getRecipes));
router.post('/', validateCreateRecipe, asyncHandler(recipeAdminController.createRecipe));
router.put('/:id', validateUpdateRecipe, asyncHandler(recipeAdminController.updateRecipe));
router.delete('/:id', asyncHandler(recipeAdminController.deleteRecipe));

module.exports = router;
