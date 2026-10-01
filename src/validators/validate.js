const Joi = require('joi');
const AppError = require('../utils/AppError.Utils');

/**
 * Reusable Express validation middleware using Joi schemas.
 * Validates request data (body, params, or query) and prevents invalid requests
 * from proceeding to controllers.
 *
 * @param {import('joi').Schema | Object} schema - Joi schema or object mapping target locations to schemas
 * @param {'body' | 'params' | 'query'} [source='body'] - Default request location to validate
 * @returns {import('express').RequestHandler}
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        // Direct Joi schema validation against specified source (default: 'body')
        if (Joi.isSchema(schema)) {
            const dataToValidate = req[source] || {};
            const { error, value } = schema.validate(dataToValidate, {
                abortEarly: false,
                stripUnknown: false
            });

            if (error) {
                const details = error.details.map((detail) => ({
                    field: detail.path.join('.'),
                    message: detail.message.replace(/['"]/g, '')
                }));

                const firstMessage = details[0]?.message || 'Validation failed';
                const validationError = new AppError(firstMessage, 400, 'VALIDATION_ERROR');
                validationError.details = details;
                return next(validationError);
            }

            req[source] = value;
            return next();
        }

        // Composite schema validation: e.g. { body: schema, params: schema, query: schema }
        if (schema && typeof schema === 'object') {
            const targets = ['body', 'params', 'query'];
            for (const target of targets) {
                if (Joi.isSchema(schema[target])) {
                    const dataToValidate = req[target] || {};
                    const { error, value } = schema[target].validate(dataToValidate, {
                        abortEarly: false,
                        stripUnknown: false
                    });

                    if (error) {
                        const details = error.details.map((detail) => ({
                            field: detail.path.join('.'),
                            message: detail.message.replace(/['"]/g, '')
                        }));

                        const firstMessage = details[0]?.message || 'Validation failed';
                        const validationError = new AppError(firstMessage, 400, 'VALIDATION_ERROR');
                        validationError.details = details;
                        return next(validationError);
                    }

                    req[target] = value;
                }
            }
            return next();
        }

        next();
    };
};

module.exports = validate;
