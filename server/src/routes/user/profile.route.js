const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const profileController = require('../../controller/user/profile.controller');
const { validateUpdateProfile } = require('../../validators/user.validator');

const router = express.Router();

router.get('/', authUser, asyncHandler(profileController.authUser));
router.put('/', authUser, validateUpdateProfile, asyncHandler(profileController.updateProfile));

module.exports = router;
