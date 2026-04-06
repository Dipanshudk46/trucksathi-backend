const express = require('express')
const router = express.Router()
const { driverRegistration } = require('../controllers/serviceController')

router.post('/driver/register', driverRegistration)

module.exports = router 
