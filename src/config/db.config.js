const mongoose = require('mongoose');
const env = require('./env.config');

const connectDB = async () => {
    try {
        if (!env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in environment configuration');
        }

        const conn = await mongoose.connect(env.MONGO_URI);
        console.log(`MongoDB connected: ${conn.connection.host || 'cluster'}`);
        return conn;
    } catch (error) {
        console.error('DB connection Failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
