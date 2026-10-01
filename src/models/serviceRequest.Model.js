const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema(
    {
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Driver',
            required: [true, 'Driver ID is required']
        },
        mechanicId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Mechanic',
            required: [true, 'Mechanic ID is required']
        },
        issue: {
            type: String,
            required: [true, 'Issue description is required'],
            trim: true
        },
        vehicleInfo: {
            type: String,
            trim: true,
            default: ''
        },
        location: {
            latitude: {
                type: Number,
                default: null
            },
            longitude: {
                type: Number,
                default: null
            },
            address: {
                type: String,
                trim: true,
                default: ''
            }
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected', 'expired'],
            default: 'pending'
        },
        requestType: {
            type: String,
            enum: ['normal', 'emergency'],
            default: 'normal'
        },
        cancelledBy: {
            type: String,
            enum: ['driver', 'mechanic', null],
            default: null
        },
        acceptedAt: {
            type: Date,
            default: null
        },
        startedAt: {
            type: Date,
            default: null
        },
        completedAt: {
            type: Date,
            default: null
        },
        cancelledAt: {
            type: Date,
            default: null
        },
        expiredAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

serviceRequestSchema.index({ mechanicId: 1, status: 1 });
serviceRequestSchema.index({ driverId: 1, createdAt: -1 });

module.exports = mongoose.models.ServiceRequest || mongoose.model('ServiceRequest', serviceRequestSchema);
