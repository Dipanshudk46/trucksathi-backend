const express = require('express')
const router = express.Router()
const { driverRegistration } = require('../controllers/serviceController')
const{driverLogin}= require('../controllers/authController')
router.post('/driver/register', driverRegistration)
router.post('/driver/login',driverLogin)


module.exports = router 
