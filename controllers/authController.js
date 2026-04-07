const Driver = require('../models/service')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const driverLogin = async (req,res)=>{
  const {email,password} = req.body
    
    if(!email){
      return  res.status(400).json({message:"Email is required "})
    }

    if(!password){
         return res.status(400).json({message:"Password is required"})
    }

    const user = await Driver.findOne({email})

    if(!user){
      return  res.status(400).json({message:"User not found"})
    }

    const isMatch = await bcrypt.compare(password,user.password)

    if(!isMatch){
        return res.status(400).json({message:"Invalid credentials"})
    }


    const token = jwt.sign(
      {id:Driver._id},
      "secretkey",
      {expiresIn:"7d"}
    )
    res.status(200).json(
      {message:"Login Successful",token})
}

module.exports ={driverLogin}