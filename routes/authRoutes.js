const express = require('express')
const router = express.Router()

const { driverRegistration } = require('../controllers/driverController')
const { driverLogin , mechanicLogin} = require('../controllers/authController')
const {createMechanic} = require('../controllers/mechanicController')

// Auth routes

//Driver
router.post('/driver/register', driverRegistration)
router.post('/driver/login', driverLogin)

//Mechainc
router.post('/mechanic/register',createMechanic)
router.post('/mechanic/login',mechanicLogin)


module.exports = router