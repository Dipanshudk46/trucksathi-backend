const Mechanic = require('../models/mechanicModel')
const bcrypt = require("bcrypt")

const createMechanic = async (req, res) => {
    try {
        const { name, phone, email, password, shopName, services, location } = req.body

        if (!name || !phone || !email || !password || !shopName || !services || !location) {
            return res.status(400).json({ message: "All fields must be provided" })
        }
        if (!email.includes("@") || email.includes(" ")) {
            return res.status(400).json({ message: "Email is invalid" })
        }
        if (phone.length !== 10 || phone.includes(" ")) {
            return res.status(400).json({ message: "Phone is invalid" })
        }
        if (password.length < 8) {
            return res.status(400).json({ message: "Password too short minimum-8 chars" })
        }

        if (!Array.isArray(services)) {
            return res.status(400).json({ message: "Services must be an array" })
        }
        const { lat, lng } = location
        if (lat === undefined || lng === undefined) {
            return res.status(400).json({ message: "Location must include both latitude and longitude" })
        }

        if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
            return res.status(400).json({ message: "Invalid latitude or Longitude" })
        }
        const existingMechanicEmail = await Mechanic.findOne({ email })
        if (existingMechanicEmail) {
            return res.status(400).json({ message: "Email already registered" })
        }

        const existingMechanicPhone = await Mechanic.findOne({ phone })
        if (existingMechanicPhone) {
            return res.status(400).json({ message: "Phone already registered" })
        }
        // password hashing 
        const hashedPassword = await bcrypt.hash(password, 10)

        const newMechanic = new Mechanic({
            name,
            email,
            phone,
            password: hashedPassword,
            shopName,
            services,
            location: {
                type: "Point",
                coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            role: "mechanic"
        })
        await newMechanic.save()
        const mechanicResponse = newMechanic.toObject()
        delete mechanicResponse.password

        res.status(201).json({
            success: true,
            message: "Mechanic registered successfully",
            data: mechanicResponse
        })

    }
    catch (error) {
        return res.status(500).json({ message: error.message })
    }

}
const mechanicProfile = async (req,res) => {
    try {
            const user_id =  req.user.id
            const mechanic = await Mechanic.findById(user_id).select('-password')

            if(!mechanic){
                return res.status(400).json({message:"User not found"})
            }
            res.status(200).json(mechanic)
    } catch (error) {
        res.status(500).json({message:error.message})
    }


}
const mechanicProfileUpdate = async(req,res)=>{
    try {
        const userId = req.user.id
        const mechanic = await Mechanic.findById(userId)
        if(!mechanic){
            return res.status(404).json({message:"User not found"})
        }
        mechanic.name = req.body.name || mechanic.name
        mechanic.phone = req.body.phone || mechanic.phone

        await mechanic.save()
    } catch (error) {
        res.status(500).json({message:error.message})
    }
}
const searchNearbBy = async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ message: "Latitude and longitude are required" })
        }
        const latitude = parseFloat(lat)
        const longitude = parseFloat(lng)
        if (latitude < -90 || latitude > 90) {
            return res.status(400).json({ message: "Latitude is Invalid" })
        }
        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({ message: "Invalid coordinate format" })
        }
        if (longitude < -180 || longitude > 180) {
            return res.status(400).json({ message: "Longitude is Invalid" })
        }

        const mechanics = await Mechanic.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [longitude, latitude]
                    },
                    distanceField: "distance",
                    spherical: true,
                    maxDistance: 5000,
                    distanceMultiplier: 0.001
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    phone: 1,
                    shopName: 1,
                    services: 1,
                    location: 1,
                    role: 1,
                    distance: { $round: ["$distance", 2] }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            count: mechanics.length,
            data: mechanics
        })
    }

    catch (error) {
        res.status(500).json({ message: error.message })
    }

}
module.exports = { createMechanic, searchNearbBy, mechanicProfile,mechanicProfileUpdate}