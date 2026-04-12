const Driver = require('../models/driverModel')
const bcrypt = require('bcrypt')

const driverRegistration = async (req, res) => {
    const { name, email, phone, role, password } = req.body

    if (!name || !email || !phone || !password) {
        return res.status(400).json({ message: "All fields are requied" })
    }

    if (!email.includes("@")) {
       return res.status(400).json({ message: "Email is invalid" })
    }
    if (phone.length !== 10) {
       return res.status(400).json({ message: "Invalid phone number" })
    }
    if (password.length < 8) {
        return res.status(400).json({ message: "Password too short minimum-8 chars" })
    }

    const existingEmail = await Driver.findOne({ email })

    if (existingEmail) {
        return res.status(400).json({
            message: "Email already exists"
        })
    }

    const existingPhone = await Driver.findOne({ phone })
   
    if (existingPhone) {
        return res.status(400).json({
            message: "phone no already exists"
        })
    }
    //password hashing using bcrypt
    const hashedPassword = await bcrypt.hash(password,10)
    
    const newUser = new Driver({
        name,
        email,
        phone,
        password:hashedPassword,
        role
    })
    await newUser.save()
    res.status(201).json({ message: "User registered successfully" })

}
const driverProfile = async(req,res)=>{
try {
    const userId = req.user.id
   const driver = await Driver.findById(userId).select('-password')
   if(!driver){
    return res.status(400).json({ message: "User  not found" })
   }
   res.status(200).json(driver)
} catch (error) {
    res.status(500).json({message:error.message})
}
}
const driverProfileUpdate = async (req, res) => {
    try {
        const userId = req.user.id
        const driver = await Driver.findById(userId)
        if (!driver) {
            return res.status(404).json({ message: "User not found" })
        }
        driver.name = req.body.name || driver.name
        driver.phone = req.body.phone || driver.phone

        await driver.save()

        res.status(200).json({
            message: "Driver info updated",
            driver
        })

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}
module.exports = { driverRegistration,driverProfile,driverProfileUpdate }