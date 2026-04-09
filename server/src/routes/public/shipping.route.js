const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const shippingController = require('../../controller/public/shipping.controller');
const { validateShippingFeeQuote } = require('../../validators/commerce.validator');

const router = express.Router();

router.get('/store-location', asyncHandler(shippingController.getStoreLocation));
router.get('/store-locations', asyncHandler(shippingController.getStoreLocations));
router.post('/fee', validateShippingFeeQuote, asyncHandler(shippingController.quoteShippingFee));

module.exports = router;
