const MechanicService = require('../services/mechanic.Service');
const asyncHandler = require('../utils/asyncHandler.Utils');

const mechanicProfile = asyncHandler(async (req, res) => {
    const mechanic = await MechanicService.getProfile(req.user.id);

    res.status(200).json(mechanic);
});

const mechanicProfileUpdate = asyncHandler(async (req, res) => {
    const updated = await MechanicService.updateProfile(req.user.id, req.body);

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        mechanic: updated,
        user: updated
    });
});

const updateMechanicAvailability = asyncHandler(async (req, res) => {
    const { isAvailable } = req.body;
    const updated = await MechanicService.updateAvailability(req.user.id, isAvailable);

    res.status(200).json({
        success: true,
        message: `Availability updated to ${isAvailable ? 'online' : 'offline'}`,
        mechanic: updated,
        user: updated
    });
});

const searchNearbBy = asyncHandler(async (req, res) => {
    const { lat, lng, radius } = req.query;

    const mechanics = await MechanicService.searchNearby({
        latitude: lat,
        longitude: lng,
        radiusInKm: radius
    });

    res.status(200).json({
        success: true,
        count: mechanics.length,
        data: mechanics
    });
});

module.exports = {
    searchNearbBy,
    mechanicProfile,
    mechanicProfileUpdate,
    updateMechanicAvailability
};
