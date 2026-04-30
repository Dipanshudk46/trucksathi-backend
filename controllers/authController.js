const Driver = require('../models/driverModel')
const Mechanic = require('../models/mechanicModel')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const driverLogin = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: "All fields required" })
        }

        const user = await Driver.findOne({ email })

        if (!user) {
            return res.status(400).json({ message: "User not found" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" })
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        )

        res.status(200).json({
            message: "Login successful",
            token
        })

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}
const mechanicLogin = async (req,res) => {
    try {
        const {email,password} = req.body
        if(!email || !password){
            return res.status(400).json({message:"All fileds are required"})
        }

        const user = await Mechanic.findOne({email})

        if(!user){
            return res.status(400).json({message:"User not found"})
        }
        const isMatch = await bcrypt.compare(password,user.password)

        if(!isMatch){
            return res.status(400).json({message:"Invalid credentials"})
        }
        const token = jwt.sign(
            {id:user._id, role:user.role},
            process.env.JWT_SECRET, 
            {expiresIn:"7d"}
        )
        res.status(200).json(
            {message:"Login Successfull",
            token
            }
        )

    } catch (error) {
        res.status(500).json({message:error.message})
    }
}
module.exports = { driverLogin , mechanicLogin}
