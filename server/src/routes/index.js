const adminRoutes = require('./admin/index.route');
const userRoutes = require('./user/index.route');
const categoryRoutes = require('./public/category.route');
const productRoutes = require('./public/product.route');
const paymentRoutes = require('./public/payment.route');
const shippingRoutes = require('./public/shipping.route');

function routes(app) {
    app.use('/api/admin', adminRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/categories', categoryRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/shipping', shippingRoutes);
}

module.exports = routes;
