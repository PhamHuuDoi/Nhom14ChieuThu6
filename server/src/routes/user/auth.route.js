const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const userController = require('../../controller/user/user.controller');
const {
    validateRegister,
    validateLogin,
    validateForgotPassword,
    validateResetPassword,
    validateVerifyForgotPassword,
    validateVerifyResetPassword,
    validateUpdateProfile,
} = require('../../validators/user.validator');

const router = express.Router();

router.post('/register', validateRegister, asyncHandler(userController.register));
router.post('/login', validateLogin, asyncHandler(userController.login));
router.get('/auth', authUser, asyncHandler(userController.authUser));
router.put('/profile', authUser, validateUpdateProfile, asyncHandler(userController.updateProfile));
router.get('/logout', authUser, asyncHandler(userController.logout));
router.post('/forgot-password', validateForgotPassword, asyncHandler(userController.forgotPassword));
router.post('/verify-forgot-password', validateVerifyForgotPassword, asyncHandler(userController.verifyForgotPassword));
router.post('/reset-password', authUser, validateResetPassword, asyncHandler(userController.resetPassword));
router.post('/verify-reset-password', authUser, validateVerifyResetPassword, asyncHandler(userController.verifyResetPassword));
router.get('/google', asyncHandler(userController.loginOauth2Google));
router.get('/google/callback', asyncHandler(userController.Oauth2callbackGoogle));
router.get('/facebook', asyncHandler(userController.loginOauth2Facebook));
router.get('/facebook/callback', asyncHandler(userController.Oauth2callbackFacebook));

module.exports = router;
