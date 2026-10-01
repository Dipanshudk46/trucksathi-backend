/**
 * Express Asynchronous Handler Wrapper
 * Catches rejected promises in async middleware/controllers and forwards them to next(error).
 * Eliminates repetitive try-catch blocks in controller endpoints.
 *
 * @param {Function} fn - Async controller or middleware function (req, res, next)
 * @returns {Function} Express middleware handler
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = asyncHandler;
