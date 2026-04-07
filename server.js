require("dotenv").config()
const connectDB = require("./config/db")
const serviceRouter = require('./routes/serviceRoutes')
const express = require("express")
const authRouter = require('./routes/authRoutes')
const app = express()
const port = 3000

app.use(express.json())
app.use('/api', serviceRouter)
app.use('/api/auth',authRouter)




app.get("/", (req, res) => {
    res.send("Server is running")
})
const startServer = async () => {
    try {
        await connectDB()
        app.listen(port, () => {
            console.log(`Server running on port ${port}`)
        })
    }
    catch (error) {
        console.log("Server failed to start", error)
    }
}
startServer()


