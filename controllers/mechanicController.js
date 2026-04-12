const Mechanic = require('../models/mechanicModel')
const bcrypt = require("bcrypt")

const createMechanic = async (req,res)=>{
    try{
        const {name,phone,email,password,shopName,services,location}=req.body   

        if(!name || !phone || !email || !password ||!shopName || !services || !location  ) {
           return res.status(400).json({message:"All fields must be provided"})
        }
        if(!email.includes("@")|| email.includes(" ")){
            return res.status(400).json({message:"Email is invalid"})
        }
        if(phone.length!==10 || phone.includes(" ")){
            return res.status(400).json({message:"Phone is invalid"})
        }
        if(password.length <8){
            return res.status(400).json({message:"Password too short minimum-8 chars"})
        }
        
        if(!Array.isArray(services)){
            return res.status(400).json({message:"Services must be an array"})
        }
        if(!location || location.lat === undefined || location.lng === undefined){
            return res.status(400).json({message:"Location must include both latitude and longitude"})
        }
        
        const existingMechanicEmail = await Mechanic.findOne({email})
        if(existingMechanicEmail){
            return res.status(400).json({message:"Email already registered"})
        }
        
        const existingMechanicPhone = await Mechanic.findOne({phone})
        if(existingMechanicPhone){
            return res.status(400).json({message:"Phone already registered"})
        }
        // password hashing 
        const hashedPassword = await bcrypt.hash(password,10)        

        const newMechanic =new Mechanic({
            name,
            email,
            phone,
            password:hashedPassword,
            shopName,
            services,
            location,
            role:"mechanic"
        })
        await newMechanic.save()
        const mechanicResponse = newMechanic.toObject() 
        delete mechanicResponse.password

        res.status(201).json({
            success:true,
            message:"Mechanic registered successfully",
            data:mechanicResponse
        })
        
    }
    catch(error){
        return res.status(500).json({message:error.message})
    }
 
}

module.exports = {createMechanic}