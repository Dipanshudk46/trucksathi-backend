const express = require('express')
const router = express.Router()

const { driverRegistration } = require('../controllers/driverController')
const { driverLogin } = require('../controllers/authController')

// Auth routes
router.post('/driver/register', driverRegistration)
router.post('/driver/login', driverLogin)

module.exports = router