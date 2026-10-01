const { ROLES, ERROR_CODES } = require('../config/constants.config');
const AppError = require('../utils/AppError.Utils');

/**
 * Role Authorization Middleware
 * Restricts route access to specified user roles.
 *
 * @param {string|string[]} roles - Single allowed role or array of allowed roles
 * @returns {import('express').RequestHandler}
 */
const authorize = (roles = []) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('No token, access denied', 401, ERROR_CODES.UNAUTHORIZED));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(new AppError('Forbidden', 403, ERROR_CODES.FORBIDDEN));
        }

        next();
    };
};

module.exports = authorize;
