const DriverService = require('../services/driver.Service');
const asyncHandler = require('../utils/asyncHandler.Utils');

const driverProfile = asyncHandler(async (req, res) => {
    const driver = await DriverService.getProfile(req.user.id);

    res.status(200).json(driver);
});

const driverProfileUpdate = asyncHandler(async (req, res) => {
    const updatedDriver = await DriverService.updateProfile(req.user.id, req.body);

    res.status(200).json({
        message: 'Driver info updated',
        driver: updatedDriver
    });
});

module.exports = {
    driverProfile,
    driverProfileUpdate
};
