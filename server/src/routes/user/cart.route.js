const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const { authUser } = require('../../middleware/authUser');
const cartUserController = require('../../controller/user/cart.user.controller');
const { validateAddToCart, validateUpdateCartQuantity } = require('../../validators/commerce.validator');

const router = express.Router();

router.use(authUser);
router.get('/', asyncHandler(cartUserController.getCart));
router.post('/items', validateAddToCart, asyncHandler(cartUserController.addToCart));
router.patch('/items/:id', validateUpdateCartQuantity, asyncHandler(cartUserController.updateQuantity));
router.delete('/items/:id', asyncHandler(cartUserController.removeFromCart));
router.delete('/clear', asyncHandler(cartUserController.clearCart));

module.exports = router;
