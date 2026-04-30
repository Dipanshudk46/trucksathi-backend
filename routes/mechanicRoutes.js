const express  = require('express')
const router = express.Router()
const {searchNearbBy,mechanicProfile} = require('../controllers/mechanicController')
const authMiddleware = require('../middleware/authMiddleware')
const authorize = require('../middleware/authorize')

router.get('/mechanic/profile',authMiddleware,authorize(["mechanic"]),mechanicProfile)

router.get('/nearby',authMiddleware,authorize(["mechanic"]),searchNearbBy)

module.exports = router
