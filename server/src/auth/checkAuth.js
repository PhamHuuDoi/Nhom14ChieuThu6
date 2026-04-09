require('dotenv').config();
const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }

    return process.env.JWT_SECRET;
};

const asyncHandler = (fn) => (req, res, next) => {
    return fn(req, res, next).catch(next);
}
const createAccessToken = (payload) => {
    return jwt.sign(payload , getJwtSecret(),
        { expiresIn: '1h' , algorithm: 'HS256'});
}
const createRefreshToken = (payload) => {
    return jwt.sign(payload, getJwtSecret(), 
        { expiresIn: '7d' , algorithm: 'HS256'});
}
const verifyToken = (token) => {
    const decoded = jwt.verify(token, getJwtSecret());
    return decoded;
}
module.exports = { asyncHandler, createAccessToken, createRefreshToken, verifyToken };
