const Mechanic = require('../models/mechanic.Model');

const create = async (data) => {
    return Mechanic.create(data);
};

const findById = async (id, projection = '-password') => {
    return Mechanic.findById(id).select(projection);
};

const findByIdWithPassword = async (id) => {
    return Mechanic.findById(id);
};

const findByEmail = async (email, projection = '-password') => {
    return Mechanic.findOne({ email }).select(projection);
};

const findByEmailWithPassword = async (email) => {
    return Mechanic.findOne({ email });
};

const findByPhone = async (phone, projection = '-password') => {
    return Mechanic.findOne({ phone }).select(projection);
};

const findPhoneConflict = async (phone, excludeId) => {
    return Mechanic.findOne({ phone, _id: { $ne: excludeId } });
};

const updateById = async (id, updateData, options = { returnDocument: 'after', runValidators: true }) => {
    return Mechanic.findByIdAndUpdate(id, updateData, options).select('-password');
};

const updateAvailability = async (id, isAvailable) => {
    return Mechanic.findByIdAndUpdate(id, { isAvailable }, { returnDocument: 'after', runValidators: true }).select('-password');
};

// Geospatial search using MongoDB $geoNear aggregation
const findNearby = async ({ longitude, latitude, maxDistanceInMeters = 5000, isAvailable = true }) => {
    const matchQuery = {};
    if (typeof isAvailable === 'boolean') {
        matchQuery.isAvailable = isAvailable;
    }

    return Mechanic.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                },
                distanceField: 'distance',
                spherical: true,
                maxDistance: maxDistanceInMeters,
                distanceMultiplier: 0.001,
                query: matchQuery
            }
        },
        {
            $project: {
                name: 1,
                email: 1,
                phone: 1,
                shopName: 1,
                services: 1,
                location: 1,
                isAvailable: 1,
                role: 1,
                distance: { $round: ['$distance', 2] }
            }
        }
    ]);
};

const count = async (filter = {}) => {
    return Mechanic.countDocuments(filter);
};

const find = async (filter = {}, projection = '-password', sort = { createdAt: -1 }) => {
    return Mechanic.find(filter).select(projection).sort(sort).lean();
};

module.exports = {
    create,
    findById,
    findByIdWithPassword,
    findByEmail,
    findByEmailWithPassword,
    findByPhone,
    findPhoneConflict,
    updateById,
    updateAvailability,
    findNearby,
    count,
    find
};
