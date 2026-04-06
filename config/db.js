const mongoose = require("mongoose")
const connectDB = async () => {
    try {
        // console.log("URI:", process.env.MONGO_URI)
        await mongoose.connect(process.env.MONGO_URI)
        console.log("MongoDB connected")
    }
    catch (error) {
        console.log("DB connection Failed", error.message)
        process.exit(1)
    }

}
module.exports = connectDB

// requrie ('dotenv').config() const mongoose=require("mongo")                          