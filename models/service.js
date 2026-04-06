const mongoose = require('mongoose')

const driverSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["driver", "mechanic"],
        default: "driver",
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("Driver", driverSchema) 