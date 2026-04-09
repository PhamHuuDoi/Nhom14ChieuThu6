const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const { requireAdmin } = require('../../middleware/requireAdmin');
const inventoryAdminController = require('../../controller/admin/inventory.admin.controller');
const { validateCreateInventory, validateUpdateInventory } = require('../../validators/inventory.validator');

const router = express.Router();

router.use(authUser, requireAdmin);
router.get('/', asyncHandler(inventoryAdminController.getInventory));
router.post('/', validateCreateInventory, asyncHandler(inventoryAdminController.createInventory));
router.put('/:id', validateUpdateInventory, asyncHandler(inventoryAdminController.updateInventory));
router.patch('/:id/status', asyncHandler(inventoryAdminController.toggleInventoryStatus));
router.delete('/:id', asyncHandler(inventoryAdminController.deleteInventory));

module.exports = router;
