const ServiceRequest = require('../models/serviceRequest.Model');

const create = async (data) => {
    return ServiceRequest.create(data);
};

const findById = async (id) => {
    return ServiceRequest.findById(id);
};

const findByIdWithDetails = async (id) => {
    return ServiceRequest.findById(id).populate([
        { path: 'driverId', select: 'name phone email' },
        { path: 'mechanicId', select: 'name shopName phone services location isAvailable' }
    ]);
};

const findByDriverId = async (driverId, filter = {}) => {
    return ServiceRequest.find({ driverId, ...filter })
        .sort({ createdAt: -1 })
        .populate({ path: 'mechanicId', select: 'name shopName phone services location isAvailable' });
};

const findByMechanicId = async (mechanicId, filter = {}) => {
    return ServiceRequest.find({ mechanicId, ...filter })
        .sort({ createdAt: -1 })
        .populate({ path: 'driverId', select: 'name phone email' });
};

const updateById = async (id, updateData, options = { returnDocument: 'after', runValidators: true }) => {
    return ServiceRequest.findByIdAndUpdate(id, updateData, options);
};

const updateStatus = async (id, status, additionalFields = {}) => {
    return ServiceRequest.findByIdAndUpdate(
        id,
        { $set: { status, ...additionalFields } },
        { returnDocument: 'after', runValidators: true }
    ).populate([
        { path: 'driverId', select: 'name phone email' },
        { path: 'mechanicId', select: 'name shopName phone services location' }
    ]);
};

// Batch expire pending requests that exceeded the 30-minute validity window
const expirePendingBefore = async (thresholdDate) => {
    return ServiceRequest.updateMany(
        { status: 'pending', createdAt: { $lt: thresholdDate } },
        { $set: { status: 'expired', expiredAt: new Date() } }
    );
};

const count = async (filter = {}) => {
    return ServiceRequest.countDocuments(filter);
};

const find = async (filter = {}, sort = { createdAt: -1 }) => {
    return ServiceRequest.find(filter)
        .sort(sort)
        .populate({ path: 'driverId', select: 'name phone email' })
        .populate({ path: 'mechanicId', select: 'name shopName phone services location' });
};

const countByDriverIds = async (driverIds) => {
    return ServiceRequest.aggregate([
        { $match: { driverId: { $in: driverIds } } },
        { $group: { _id: '$driverId', count: { $sum: 1 } } }
    ]);
};

const countByMechanicIds = async (mechanicIds) => {
    return ServiceRequest.aggregate([
        { $match: { mechanicId: { $in: mechanicIds } } },
        { $group: { _id: '$mechanicId', count: { $sum: 1 } } }
    ]);
};

module.exports = {
    create,
    findById,
    findByIdWithDetails,
    findByDriverId,
    findByMechanicId,
    updateById,
    updateStatus,
    expirePendingBefore,
    count,
    find,
    countByDriverIds,
    countByMechanicIds
};
