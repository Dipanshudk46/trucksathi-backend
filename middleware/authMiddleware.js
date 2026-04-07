const jwt = require('jsonwebtoken')

const protect =(req,res,next)=>{
try{
    const token = req.headers.authorization

    if(!token){
        return res.status(401).json({message:"No token ,access declined"})
    }

    const decoded = jwt.verify(token,"secretkey")
    req.Driver = decoded.id

    next()
}
catch(error){
    res.status(401).json({message:"invalid token"})
}
}
module.exports = protect