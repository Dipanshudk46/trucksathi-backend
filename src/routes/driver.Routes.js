const express = require('express');
const router = express.Router();

const {
    driverProfile,
    driverProfileUpdate
} = require('../controllers/driver.Controller');

const authMiddleware = require('../middleware/auth.Middleware');
const authorize = require('../middleware/authorize.Middleware');
const validate = require('../validators/validate');
const { driverProfileUpdateSchema } = require('../validators/profile.Validator');

// Protected Driver Profile Endpoints
router.get('/driver/profile', authMiddleware, authorize(['driver']), driverProfile);
router.put(
    '/update/driver/profile',
    authMiddleware,
    authorize(['driver']),
    validate(driverProfileUpdateSchema),
    driverProfileUpdate
);

module.exports = router;
