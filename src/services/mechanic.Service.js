const MechanicRepository = require('../repositories/mechanic.Repository');
const AppError = require('../utils/AppError.Utils');
const { SUPPORTED_SERVICES } = require('../config/constants.config');

const getProfile = async (userId) => {
    const mechanic = await MechanicRepository.findById(userId, '-password');
    if (!mechanic) {
        throw new AppError('User not found', 400, 'USER_NOT_FOUND');
    }
    return mechanic;
};

const updateProfile = async (userId, updateData) => {
    const mechanic = await MechanicRepository.findById(userId);
    if (!mechanic) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const fieldsToUpdate = {};

    if (updateData.name !== undefined && updateData.name !== null) {
        const trimmedName = String(updateData.name).trim();
        if (!trimmedName) {
            throw new AppError('Name cannot be empty', 400, 'INVALID_NAME');
        }
        fieldsToUpdate.name = trimmedName;
    }

    if (updateData.phone !== undefined && updateData.phone !== null) {
        const cleanPhone = String(updateData.phone).replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            throw new AppError('Phone number must be exactly 10 digits', 400, 'INVALID_PHONE');
        }

        if (cleanPhone !== mechanic.phone) {
            const phoneExists = await MechanicRepository.findPhoneConflict(cleanPhone, userId);
            if (phoneExists) {
                throw new AppError('Phone number already registered with another account', 400, 'PHONE_EXISTS');
            }
            fieldsToUpdate.phone = cleanPhone;
        }
    }

    if (updateData.shopName !== undefined && updateData.shopName !== null) {
        const trimmedShop = String(updateData.shopName).trim();
        if (trimmedShop) {
            fieldsToUpdate.shopName = trimmedShop;
        }
    }

    if (typeof updateData.isAvailable === 'boolean') {
        fieldsToUpdate.isAvailable = updateData.isAvailable;
    }

    if (updateData.services !== undefined) {
        if (!Array.isArray(updateData.services)) {
            throw new AppError('Services must be an array', 400, 'INVALID_SERVICES');
        }

        const validServices = Array.from(
            new Set(
                updateData.services
                    .map((s) => String(s).trim())
                    .filter((s) => SUPPORTED_SERVICES.includes(s))
            )
        );

        if (validServices.length === 0) {
            const error = new AppError('At least one valid supported service must be selected', 400, 'INVALID_SERVICES');
            error.supportedServices = SUPPORTED_SERVICES;
            throw error;
        }

        fieldsToUpdate.services = validServices;
    }

    if (updateData.location && updateData.location.lat !== undefined && updateData.location.lng !== undefined) {
        const lat = parseFloat(updateData.location.lat);
        const lng = parseFloat(updateData.location.lng);

        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new AppError('Invalid latitude or longitude coordinates', 400, 'INVALID_COORDINATES');
        }

        fieldsToUpdate.location = {
            type: 'Point',
            coordinates: [lng, lat]
        };
    }

    const updatedMechanic = await MechanicRepository.updateById(userId, fieldsToUpdate);
    return updatedMechanic;
};

const updateAvailability = async (userId, isAvailable) => {
    if (typeof isAvailable !== 'boolean') {
        throw new AppError('isAvailable must be a boolean value', 400, 'INVALID_INPUT');
    }

    const mechanic = await MechanicRepository.findById(userId);
    if (!mechanic) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const updated = await MechanicRepository.updateAvailability(userId, isAvailable);
    return updated;
};

const searchNearby = async ({ latitude, longitude, radiusInKm = 5 }) => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new AppError('Latitude is Invalid', 400, 'INVALID_LATITUDE');
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
        throw new AppError('Longitude is Invalid', 400, 'INVALID_LONGITUDE');
    }

    const radius = parseFloat(radiusInKm);
    const maxDistanceInMeters = (!isNaN(radius) && radius > 0) ? radius * 1000 : 5000;

    const mechanics = await MechanicRepository.findNearby({
        longitude: lng,
        latitude: lat,
        maxDistanceInMeters,
        isAvailable: true
    });

    return mechanics;
};

module.exports = {
    getProfile,
    updateProfile,
    updateAvailability,
    searchNearby
};
