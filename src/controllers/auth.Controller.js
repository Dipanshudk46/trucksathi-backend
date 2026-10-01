const AuthService = require('../services/auth.Service');
const asyncHandler = require('../utils/asyncHandler.Utils');

const driverLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.loginDriver(email, password);

    res.status(200).json(result);
});

const mechanicLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.loginMechanic(email, password);

    res.status(200).json(result);
});

const driverRegistration = asyncHandler(async (req, res) => {
    const driver = await AuthService.registerDriver(req.body);

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        driver
    });
});

const createMechanic = asyncHandler(async (req, res) => {
    const mechanic = await AuthService.registerMechanic(req.body);

    res.status(201).json({
        success: true,
        message: 'Mechanic registered successfully',
        data: mechanic
    });
});

const adminLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.loginAdmin(email, password);

    res.status(200).json(result);
});

module.exports = {
    driverLogin,
    mechanicLogin,
    driverRegistration,
    createMechanic,
    adminLogin
};
