const Driver = require('../models/driverModel')
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
            { id: user._id },
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

module.exports = { driverLogin }