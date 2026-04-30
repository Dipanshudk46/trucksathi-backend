const express = require('express')
const router = express.Router()
const {driverProfile,driverProfileUpdate} = require('../controllers/driverController')

const authMiddleware = require('../middleware/authMiddleware')
const authorize = require('../middleware/authorize')

router.get('/driver/profile',authMiddleware,authorize(["driver"]),driverProfile)
router.put('/update/driver/profile',authMiddleware,authorize(["driver"]),driverProfileUpdate)

module.exports = router
