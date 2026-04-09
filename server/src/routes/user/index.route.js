const express = require('express');

const { asyncHandler } = require('../../auth/checkAuth');
const shippingController = require('../../controller/public/shipping.controller');
const authRoutes = require('./auth.route');
const categoryRoutes = require('./category.route');
const productRoutes = require('./product.route');
const cartRoutes = require('./cart.route');
const orderRoutes = require('./order.route');
const profileRoutes = require('./profile.route');
const addressRoutes = require('./address.route');
const paymentRoutes = require('./payment.route');
const couponRoutes = require('./coupon.route');
const notificationRoutes = require('./notification.route');

const router = express.Router();

router.get('/store-location', asyncHandler(shippingController.getStoreLocation));
router.get('/store-locations', asyncHandler(shippingController.getStoreLocations));
router.use('/', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/profile', profileRoutes);
router.use('/address', addressRoutes);
router.use('/payments', paymentRoutes);
router.use('/coupons', couponRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
