const Joi = require('joi');
const { SUPPORTED_SERVICES } = require('../config/constants.config');

/**
 * Profile Update Validators
 * Covers driver and mechanic profile updates and availability toggling.
 */

const phonePattern = /^\d{10}$/;

/**
 * Driver Profile Update Schema
 * Validates fields for PUT /api/update/driver/profile
 */
const driverProfileUpdateSchema = Joi.object({
    name: Joi.string().trim().min(1).optional().messages({
        'string.empty': 'Name cannot be empty'
    }),
    phone: Joi.string().trim().pattern(phonePattern).optional().messages({
        'string.pattern.base': 'Phone number must be exactly 10 digits'
    })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

/**
 * Mechanic Profile Update Schema
 * Validates fields for PUT /api/update/mechanic/profile
 */
const mechanicProfileUpdateSchema = Joi.object({
    name: Joi.string().trim().min(1).optional().messages({
        'string.empty': 'Name cannot be empty'
    }),
    phone: Joi.string().trim().pattern(phonePattern).optional().messages({
        'string.pattern.base': 'Phone number must be exactly 10 digits'
    }),
    shopName: Joi.string().trim().min(1).optional().messages({
        'string.empty': 'Shop name cannot be empty'
    }),
    isAvailable: Joi.boolean().optional(),
    services: Joi.array()
        .items(Joi.string().trim().valid(...SUPPORTED_SERVICES))
        .min(1)
        .optional()
        .messages({
            'array.min': 'At least one supported service must be selected',
            'any.only': 'Service must be from the supported services catalog'
        }),
    location: Joi.object({
        lat: Joi.number().min(-90).max(90).required().messages({
            'number.base': 'Latitude must be a valid number',
            'number.min': 'Latitude must be between -90 and 90',
            'number.max': 'Latitude must be between -90 and 90'
        }),
        lng: Joi.number().min(-180).max(180).required().messages({
            'number.base': 'Longitude must be a valid number',
            'number.min': 'Longitude must be between -180 and 180',
            'number.max': 'Longitude must be between -180 and 180'
        }),
        address: Joi.string().trim().allow('').optional()
    }).optional()
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

/**
 * Mechanic Availability Schema
 * Validates fields for PATCH /api/mechanic/availability
 */
const mechanicAvailabilitySchema = Joi.object({
    isAvailable: Joi.boolean().required().messages({
        'boolean.base': 'isAvailable must be a boolean value',
        'any.required': 'isAvailable is required'
    })
});

module.exports = {
    driverProfileUpdateSchema,
    mechanicProfileUpdateSchema,
    mechanicAvailabilitySchema
};
