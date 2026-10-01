const Admin = require('../models/admin.Model');

const create = async (data) => {
    return Admin.create(data);
};

const findById = async (id, projection = '-password') => {
    return Admin.findById(id).select(projection);
};

const findByEmail = async (email, projection = '-password') => {
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    return Admin.findOne({ email: cleanEmail }).select(projection);
};

const findByEmailWithPassword = async (email) => {
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    return Admin.findOne({ email: cleanEmail });
};

const count = async (filter = {}) => {
    return Admin.countDocuments(filter);
};

module.exports = {
    create,
    findById,
    findByEmail,
    findByEmailWithPassword,
    count
};
