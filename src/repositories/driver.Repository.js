const Driver = require('../models/driver.Model');

const create = async (data) => {
    return Driver.create(data);
};

const findById = async (id, projection = '-password') => {
    return Driver.findById(id).select(projection);
};

const findByIdWithPassword = async (id) => {
    return Driver.findById(id);
};

const findByEmail = async (email, projection = '-password') => {
    return Driver.findOne({ email }).select(projection);
};

const findByEmailWithPassword = async (email) => {
    return Driver.findOne({ email });
};

const findByPhone = async (phone, projection = '-password') => {
    return Driver.findOne({ phone }).select(projection);
};

const updateById = async (id, updateData, options = { returnDocument: 'after', runValidators: true }) => {
    return Driver.findByIdAndUpdate(id, updateData, options).select('-password');
};

const deleteById = async (id) => {
    return Driver.findByIdAndDelete(id);
};

const count = async (filter = {}) => {
    return Driver.countDocuments(filter);
};

const find = async (filter = {}, projection = '-password', sort = { createdAt: -1 }) => {
    return Driver.find(filter).select(projection).sort(sort).lean();
};

module.exports = {
    create,
    findById,
    findByIdWithPassword,
    findByEmail,
    findByEmailWithPassword,
    findByPhone,
    updateById,
    deleteById,
    count,
    find
};
