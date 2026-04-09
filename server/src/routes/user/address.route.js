const express = require('express');

const addressRouter = require('../public/shipping.route');

const router = express.Router();

router.use('/', addressRouter);

module.exports = router;
