const env = require("./src/config/env.config")
const connectDB = require("./src/config/db.config")
const seedDefaultAdmin = require("./src/config/seedAdmin.config")
const driverRoutes = require('./src/routes/driver.Routes')
const express = require("express")
const cors = require("cors")
const authRouter = require('./src/routes/auth.Routes')
const mechanicRoutes = require('./src/routes/mechanic.Routes')
const requestRoutes = require('./src/routes/request.Routes')
const adminRoutes = require('./src/routes/admin.Routes')
const analyticsRoutes = require('./src/routes/analytics.Routes')

const app = express()
const port = env.PORT || 3000

// HTTP Security: disable fingerprinting headers
app.disable('x-powered-by')

// Body limits: prevent payload flooding / denial-of-service
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(cors())

app.use('/api', driverRoutes)
app.use('/api/auth', authRouter)
app.use('/api', mechanicRoutes)
app.use('/api', requestRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/analytics', analyticsRoutes)

const errorHandler = require('./src/middleware/errorHandler.Middleware')
const AppError = require('./src/utils/AppError.Utils')
const { ERROR_CODES } = require('./src/config/constants.config')

app.get("/", (req, res) => {
    res.send("Server is running")
})

// 404 Handler for undefined API routes
app.use((req, res, next) => {
    next(new AppError('Route not found', 404, ERROR_CODES.ROUTE_NOT_FOUND));
});

// Centralized Application Error Handling Middleware
app.use(errorHandler);

let server;

const startServer = async () => {
    try {
        env.validate()
        await connectDB()
        await seedDefaultAdmin()
        server = app.listen(port, () => {
            console.log(`Server running on port ${port}`)
        })
    }
    catch (error) {
        console.error("Server failed to start:", error.message)
        process.exit(1)
    }
}

const gracefulShutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`)
    if (server) {
        server.close(async () => {
            console.log('[Server] HTTP connections closed.')
            try {
                const mongoose = require('mongoose')
                await mongoose.connection.close(false)
                console.log('[Server] Database connection closed.')
                process.exit(0)
            } catch (err) {
                console.error('[Server] Error during database disconnect:', err.message)
                process.exit(1)
            }
        })
    } else {
        process.exit(0)
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

startServer()


