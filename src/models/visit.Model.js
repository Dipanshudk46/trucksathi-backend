const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema(
    {
        visitorId: {
            type: String,
            required: true,
            index: true
        },
        path: {
            type: String,
            default: '/'
        },
        ip: {
            type: String,
            default: ''
        },
        userAgent: {
            type: String,
            default: ''
        },
        visitedAt: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        timestamps: false
    }
);

// Compound index for efficient cooldown lookups
visitSchema.index({ visitorId: 1, visitedAt: -1 });

module.exports = mongoose.models.Visit || mongoose.model('Visit', visitSchema);
