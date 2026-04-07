const express = require('express')
const router = express.Router()
const protect = require('../middleware/authMiddleware')

router.get('/profile',(req,res)=>{
    res.json({
        message:"profile accessed successfully",
        userId : req.Driver
    })
})

module.exports = router