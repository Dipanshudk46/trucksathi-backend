require('dotenv').config();

const env = Object.freeze({
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    MONGO_URI: process.env.MONGO_URI || '',
    JWT_SECRET: process.env.JWT_SECRET || '',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    ADMIN_EMAIL: (process.env.ADMIN_EMAIL || 'admin@trucksathi.com').toLowerCase().trim(),
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',

    validate() {
        const missing = [];
        if (!this.MONGO_URI) missing.push('MONGO_URI');
        if (!this.JWT_SECRET) missing.push('JWT_SECRET');

        if (missing.length > 0) {
            throw new Error(`[Config Error] Missing critical environment variables: ${missing.join(', ')}`);
        }
        return true;
    }
});

module.exports = env;

