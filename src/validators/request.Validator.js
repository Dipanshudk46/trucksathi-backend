const Joi = require('joi');

/**
 * Service Request & Query Validators
 * Validates request creation, route parameter IDs, nearby search queries, and visitor beacons.
 */

// MongoDB ObjectId regex: exactly 24 hexadecimal characters
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

/**
 * Service Request Creation Schema
 * Validates body for POST /api/requests
 */
const createRequestSchema = Joi.object({
    mechanicId: Joi.string().pattern(objectIdPattern).required().messages({
        'string.pattern.base': 'Invalid mechanic ID format',
        'string.empty': 'Mechanic ID is required',
        'any.required': 'Mechanic ID is required'
    }),
    issue: Joi.string().trim().min(1).required().messages({
        'string.empty': 'Issue description is required',
        'any.required': 'Issue description is required'
    }),
    requestType: Joi.string().valid('normal', 'emergency').default('normal').optional().messages({
        'any.only': 'Request type must be either normal or emergency'
    }),
    vehicleInfo: Joi.string().trim().allow('').optional(),
    location: Joi.object({
        latitude: Joi.number().min(-90).max(90).allow(null).optional().messages({
            'number.min': 'Latitude must be between -90 and 90',
            'number.max': 'Latitude must be between -90 and 90'
        }),
        longitude: Joi.number().min(-180).max(180).allow(null).optional().messages({
            'number.min': 'Longitude must be between -180 and 180',
            'number.max': 'Longitude must be between -180 and 180'
        }),
        address: Joi.string().trim().allow('').optional()
    }).optional()
});

/**
 * Request ID Route Parameter Schema
 * Validates params for /api/requests/:requestId, :requestId/accept, etc.
 */
const requestIdParamSchema = Joi.object({
    requestId: Joi.string().pattern(objectIdPattern).required().messages({
        'string.pattern.base': 'Invalid request ID format',
        'string.empty': 'Request ID is required',
        'any.required': 'Request ID is required'
    })
});

/**
 * Nearby Search Query Schema
 * Validates query parameters for GET /api/nearby
 */
const nearbySearchQuerySchema = Joi.object({
    lat: Joi.number().min(-90).max(90).required().messages({
        'number.base': 'Latitude must be a valid number',
        'number.min': 'Latitude is Invalid',
        'number.max': 'Latitude is Invalid',
        'any.required': 'Latitude is required'
    }),
    lng: Joi.number().min(-180).max(180).required().messages({
        'number.base': 'Longitude must be a valid number',
        'number.min': 'Longitude is Invalid',
        'number.max': 'Longitude is Invalid',
        'any.required': 'Longitude is required'
    }),
    radius: Joi.number().positive().optional().messages({
        'number.base': 'Radius must be a positive number',
        'number.positive': 'Radius must be greater than 0'
    })
});

/**
 * Visitor Tracking Schema
 * Validates body for POST /api/analytics/visit
 */
const visitorBeaconSchema = Joi.object({
    visitorId: Joi.string().trim().min(1).max(100).required().messages({
        'string.empty': 'Valid visitor identifier is required',
        'any.required': 'Valid visitor identifier is required'
    }),
    path: Joi.string().trim().max(150).allow('').optional(),
    referrer: Joi.string().trim().allow('').optional()
});

module.exports = {
    createRequestSchema,
    requestIdParamSchema,
    nearbySearchQuerySchema,
    visitorBeaconSchema
};
