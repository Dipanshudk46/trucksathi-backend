const DriverRepository = require('../repositories/driver.Repository');
const AppError = require('../utils/AppError.Utils');

const getProfile = async (userId) => {
    const driver = await DriverRepository.findById(userId, '-password');
    if (!driver) {
        throw new AppError('User not found', 400, 'USER_NOT_FOUND');
    }
    return driver;
};

const updateProfile = async (userId, updateData) => {
    const driver = await DriverRepository.findById(userId);
    if (!driver) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const fieldsToUpdate = {};
    if (updateData.name !== undefined && updateData.name !== null) {
        fieldsToUpdate.name = String(updateData.name).trim();
    }
    if (updateData.phone !== undefined && updateData.phone !== null) {
        fieldsToUpdate.phone = String(updateData.phone).trim();
    }

    const updatedDriver = await DriverRepository.updateById(userId, fieldsToUpdate);
    return updatedDriver;
};

module.exports = {
    getProfile,
    updateProfile
};
