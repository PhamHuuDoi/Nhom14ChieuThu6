const express = require('express');

const categoryRoutes = require('./category.route');
const productRoutes = require('./product.route');
const orderRoutes = require('./order.route');
const dashboardRoutes = require('./dashboard.route');
const couponRoutes = require('./coupon.route');
const userRoutes = require('./user.route');
const inventoryRoutes = require('./inventory.route');
const recipeRoutes = require('./recipe.route');
const paymentRoutes = require('./payment.route');
const storeLocationRoutes = require('./store-location.route');
const uploadRoutes = require('./upload.route');
const notificationRoutes = require('./notification.route');

const router = express.Router();

router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/coupons', couponRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/recipes', recipeRoutes);
router.use('/payments', paymentRoutes);
router.use('/store-locations', storeLocationRoutes);
router.use('/uploads', uploadRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
