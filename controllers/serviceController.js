const Driver = require('../models/service')
const bcrypt = require('bcrypt')
const driverRegistration = async (req, res) => {
    const { name, email, phone, role, password } = req.body

    if (!name || !email || !phone || !password) {
        return res.status(400).json({ message: "All fields are requied" })
    }

    if (!email.includes("@")) {
        res.status(400).json({ message: "Email is invalid" })
    }
    if (phone.length !== 10) {
        res.status(400).json({ message: "Invalid phone number" })
    }
    if (password.length < 8) {
        return res.status(400).json({ message: "Passowrd too short mininum-8 chars" })
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

module.exports = { driverRegistration }