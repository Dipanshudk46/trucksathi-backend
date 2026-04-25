const express  = require('express')
const router = express.Router()
const {searchNearbBy,mechanicProfile} = require('../controllers/mechanicController')
const protect = require('../middleware/authMiddleware')

router.get('/mechanic/profile',protect,mechanicProfile)

router.get('/nearby',searchNearbBy)

module.exports = router