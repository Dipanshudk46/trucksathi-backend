const express = require('express');
const router = express.Router();

const {
    searchNearbBy,
    mechanicProfile,
    mechanicProfileUpdate,
    updateMechanicAvailability
} = require('../controllers/mechanic.Controller');

const authMiddleware = require('../middleware/auth.Middleware');
const authorize = require('../middleware/authorize.Middleware');
const validate = require('../validators/validate');
const {
    mechanicProfileUpdateSchema,
    mechanicAvailabilitySchema
} = require('../validators/profile.Validator');
const { nearbySearchQuerySchema } = require('../validators/request.Validator');

// Protected Mechanic Endpoints
router.get('/mechanic/profile', authMiddleware, authorize(['mechanic']), mechanicProfile);

router.patch(
    '/mechanic/availability',
    authMiddleware,
    authorize(['mechanic']),
    validate(mechanicAvailabilitySchema),
    updateMechanicAvailability
);

router.put(
    '/update/mechanic/profile',
    authMiddleware,
    authorize(['mechanic']),
    validate(mechanicProfileUpdateSchema),
    mechanicProfileUpdate
);

router.get(
    '/nearby',
    authMiddleware,
    authorize(['driver', 'mechanic']),
    validate(nearbySearchQuerySchema, 'query'),
    searchNearbBy
);

module.exports = router;
