const Joi = require('joi');

/**
 * Authentication Validators
 * Defines structural input validation schemas for driver, mechanic, and admin authentication endpoints.
 */

// Custom phone pattern: exactly 10 digits without whitespace
const phonePattern = /^\d{10}$/;

/**
 * Driver Registration Schema
 * Validates fields required by POST /api/auth/driver/register
 */
const driverRegisterSchema = Joi.object({
    name: Joi.string().trim().min(1).required().messages({
        'string.empty': 'Name is required',
        'any.required': 'Name is required'
    }),
    email: Joi.string().email({ tlds: { allow: false } }).trim().required().messages({
        'string.email': 'Email is invalid',
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
    }),
    phone: Joi.string().trim().pattern(phonePattern).required().messages({
        'string.pattern.base': 'Invalid phone number',
        'string.empty': 'Phone is required',
        'any.required': 'Phone is required'
    }),
    password: Joi.string().min(8).required().messages({
        'string.min': 'Password too short minimum-8 chars',
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
    }),
    role: Joi.string().valid('driver', 'mechanic').default('driver')
});

/**
 * Driver Login Schema
 * Validates fields for POST /api/auth/driver/login
 */
const driverLoginSchema = Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).trim().required().messages({
        'string.email': 'Email is invalid',
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
    })
});

/**
 * Mechanic Registration Schema
 * Validates fields for POST /api/auth/mechanic/register
 */
const mechanicRegisterSchema = Joi.object({
    name: Joi.string().trim().min(1).required().messages({
        'string.empty': 'Name is required',
        'any.required': 'Name is required'
    }),
    phone: Joi.string().trim().pattern(phonePattern).required().messages({
        'string.pattern.base': 'Phone is invalid',
        'string.empty': 'Phone is required',
        'any.required': 'Phone is required'
    }),
    email: Joi.string().email({ tlds: { allow: false } }).trim().required().messages({
        'string.email': 'Email is invalid',
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).required().messages({
        'string.min': 'Password too short minimum-8 chars',
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
    }),
    shopName: Joi.string().trim().min(1).required().messages({
        'string.empty': 'Shop name is required',
        'any.required': 'Shop name is required'
    }),
    services: Joi.array().items(Joi.string().trim()).min(1).required().messages({
        'array.min': 'At least one service must be provided',
        'array.base': 'Services must be an array',
        'any.required': 'Services are required'
    }),
    location: Joi.object({
        lat: Joi.number().min(-90).max(90).required().messages({
            'number.base': 'Latitude must be a valid number',
            'number.min': 'Latitude must be between -90 and 90',
            'number.max': 'Latitude must be between -90 and 90',
            'any.required': 'Location must include both latitude and longitude'
        }),
        lng: Joi.number().min(-180).max(180).required().messages({
            'number.base': 'Longitude must be a valid number',
            'number.min': 'Longitude must be between -180 and 180',
            'number.max': 'Longitude must be between -180 and 180',
            'any.required': 'Location must include both latitude and longitude'
        }),
        address: Joi.string().trim().allow('').optional()
    }).required().messages({
        'any.required': 'Location is required'
    })
});

/**
 * Mechanic Login Schema
 * Validates fields for POST /api/auth/mechanic/login
 */
const mechanicLoginSchema = Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).trim().required().messages({
        'string.email': 'Email is invalid',
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
    })
});

/**
 * Admin Login Schema
 * Validates fields for POST /api/admin/login
 */
const adminLoginSchema = Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).trim().required().messages({
        'string.email': 'Email is invalid',
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
    })
});

module.exports = {
    driverRegisterSchema,
    driverLoginSchema,
    mechanicRegisterSchema,
    mechanicLoginSchema,
    adminLoginSchema
};
