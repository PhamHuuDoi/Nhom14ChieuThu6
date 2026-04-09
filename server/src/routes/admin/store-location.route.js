const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const { requireAdmin } = require('../../middleware/requireAdmin');
const storeLocationAdminController = require('../../controller/admin/store-location.admin.controller');

const router = express.Router();

router.get('/', authUser, requireAdmin, asyncHandler(storeLocationAdminController.getStoreLocations));
router.post('/', authUser, requireAdmin, asyncHandler(storeLocationAdminController.createStoreLocation));
router.patch('/:id/primary', authUser, requireAdmin, asyncHandler(storeLocationAdminController.setPrimaryStoreLocation));

module.exports = router;
