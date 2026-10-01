const express = require('express');
const router = express.Router();

const { recordVisit } = require('../controllers/analytics.Controller');
const validate = require('../validators/validate');
const { visitorBeaconSchema } = require('../validators/request.Validator');

// Public visitor tracking endpoint
router.post('/visit', validate(visitorBeaconSchema), recordVisit);

module.exports = router;
