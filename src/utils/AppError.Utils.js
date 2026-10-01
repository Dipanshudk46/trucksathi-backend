/**
 * Custom Operational Application Error Class
 * Used for known, handled errors across controllers, services, and middlewares.
 */
class AppError extends Error {
    /**
     * @param {string} message - Human-readable error description
     * @param {number} [statusCode=500] - HTTP status code
     * @param {string} [code='INTERNAL_ERROR'] - Machine-readable application error code
     * @param {*} [details=null] - Optional structured error details
     */
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);

        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        if (details !== null && details !== undefined) {
            this.details = details;
        }

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
