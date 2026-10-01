const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            default: 'Administrator'
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ['admin'],
            default: 'admin'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
