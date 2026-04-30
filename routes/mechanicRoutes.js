const express  = require('express')
const router = express.Router()
const {searchNearbBy,mechanicProfile,mechanicProfileUpdate} = require('../controllers/mechanicController')
const authMiddleware = require('../middleware/authMiddleware')
const authorize = require('../middleware/authorize')

router.get('/mechanic/profile',authMiddleware,authorize(["mechanic"]),mechanicProfile)

router.get('/nearby',authMiddleware,authorize(["mechanic"]),searchNearbBy)
router.put('/update/mechanic/profile',authMiddleware.authorize(["mechanic"]),mechanicProfileUpdate)

module.exports = router
