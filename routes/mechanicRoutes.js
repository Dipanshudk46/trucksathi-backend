const express  = require('express')
const router = express.Router()
const {searchNearbBy} = require('../controllers/mechanicController')
router.get('/nearby',searchNearbBy)

module.exports = router