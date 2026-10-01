const jwt = require('jsonwebtoken');
const env = require('../config/env.config');

const generateToken = (payload, expiresIn = env.JWT_EXPIRES_IN || '7d') => {
    const secret = env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured in environment variables');
    }

    return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token) => {
    const secret = env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured in environment variables');
    }

    return jwt.verify(token, secret);
};

module.exports = {
    generateToken,
    verifyToken
};
