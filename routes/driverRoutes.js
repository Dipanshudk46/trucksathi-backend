const express = require('express')
const router = express.Router()
const {driverProfile,driverProfileUpdate} = require('../controllers/driverController')

const protect = require('../middleware/authMiddleware')

router.get('/driver/profile',protect ,driverProfile)
router.put('/update/driver/profile',protect,driverProfileUpdate)

module.exports = router