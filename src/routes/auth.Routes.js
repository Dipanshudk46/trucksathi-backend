const express = require('express');
const router = express.Router();

const {
    driverRegistration,
    driverLogin,
    createMechanic,
    mechanicLogin
} = require('../controllers/auth.Controller');

const validate = require('../validators/validate');
const {
    driverRegisterSchema,
    driverLoginSchema,
    mechanicRegisterSchema,
    mechanicLoginSchema
} = require('../validators/auth.Validator');

// Public Driver Authentication
router.post('/driver/register', validate(driverRegisterSchema), driverRegistration);
router.post('/driver/login', validate(driverLoginSchema), driverLogin);

// Public Mechanic Authentication
router.post('/mechanic/register', validate(mechanicRegisterSchema), createMechanic);
router.post('/mechanic/login', validate(mechanicLoginSchema), mechanicLogin);

module.exports = router;
