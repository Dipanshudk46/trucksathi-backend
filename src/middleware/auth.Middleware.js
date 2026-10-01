const { verifyToken } = require('../utils/jwtHelper.Utils');
const AppError = require('../utils/AppError.Utils');
const { ERROR_CODES } = require('../config/constants.config');

/**
 * Authentication Middleware
 * Validates incoming Bearer JWT tokens and attaches authenticated user payload to req.user.
 */
const authMiddleware = (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new AppError('No token, access denied', 401, ERROR_CODES.UNAUTHORIZED));
        }

        const decoded = verifyToken(token);
        req.user = decoded;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Token expired', 401, ERROR_CODES.UNAUTHORIZED));
        }
        return next(new AppError('Invalid token', 403, ERROR_CODES.FORBIDDEN));
    }
};

module.exports = authMiddleware;
