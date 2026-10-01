const AppError = require('../utils/AppError.Utils');
const { ERROR_CODES } = require('../config/constants.config');

const errorHandler = (err, req, res, next) => {
    let error = err;

    if (err.name === 'CastError') {
        const message = `Invalid ${err.path || 'identifier'}: ${err.value}`;
        error = new AppError(message, 400, ERROR_CODES.VALIDATION_ERROR);
    } else if (err.name === 'ValidationError' && err.errors) {
        const details = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        const message = details.map(d => d.message).join(', ') || 'Validation error';
        error = new AppError(message, 400, ERROR_CODES.VALIDATION_ERROR, details);
    } else if (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000)) {
        const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
        const message = `A record with that ${field} already exists`;
        error = new AppError(message, 409, ERROR_CODES.CONFLICT);
    } else if (err.name === 'JsonWebTokenError') {
        error = new AppError('Invalid token', 403, ERROR_CODES.FORBIDDEN);
    } else if (err.name === 'TokenExpiredError') {
        error = new AppError('Token expired', 401, ERROR_CODES.UNAUTHORIZED);
    }

    const statusCode = error.statusCode || (res.statusCode && res.statusCode >= 400 ? res.statusCode : 500);
    const isOperational = error.isOperational === true;
    const errorCode = error.code || (statusCode >= 500 ? ERROR_CODES.INTERNAL_SERVER_ERROR : 'ERROR');

    let message = error.message;
    if (!isOperational && statusCode === 500) {
        console.error('[Unhandled Server Error]:', err);
        message = 'Internal Server Error';
    }

    const responsePayload = {
        success: false,
        message,
        code: errorCode
    };

    if (error.details) {
        responsePayload.details = error.details;
        responsePayload.errors = error.details;
    }

    if (error.supportedServices) {
        responsePayload.supportedServices = error.supportedServices;
    }

    return res.status(statusCode).json(responsePayload);
};

module.exports = errorHandler;
