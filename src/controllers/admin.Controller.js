const AdminService = require('../services/admin.Service');
const AuthService = require('../services/auth.Service');
const asyncHandler = require('../utils/asyncHandler.Utils');

const adminLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.loginAdmin(email, password);

    res.status(200).json({
        success: true,
        message: result.message,
        token: result.token,
        user: result.user
    });
});

const getDashboardStats = asyncHandler(async (req, res) => {
    const stats = await AdminService.getDashboardStats();

    res.status(200).json({
        success: true,
        data: stats
    });
});

const getAllUsers = asyncHandler(async (req, res) => {
    const { role, search } = req.query;
    const allUsers = await AdminService.getAllUsers({ role, search });

    res.status(200).json({
        success: true,
        count: allUsers.length,
        data: allUsers
    });
});

const getAllDrivers = asyncHandler(async (req, res) => {
    const drivers = await AdminService.getAllDrivers();

    res.status(200).json({
        success: true,
        count: drivers.length,
        data: drivers
    });
});

const getAllMechanics = asyncHandler(async (req, res) => {
    const mechanics = await AdminService.getAllMechanics();

    res.status(200).json({
        success: true,
        count: mechanics.length,
        data: mechanics
    });
});

const getAllRequests = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const requests = await AdminService.getAllRequests({ status });

    res.status(200).json({
        success: true,
        count: requests.length,
        data: requests
    });
});

const getAnalytics = asyncHandler(async (req, res) => {
    const analytics = await AdminService.getAnalytics();

    res.status(200).json({
        success: true,
        data: analytics
    });
});

module.exports = {
    adminLogin,
    getDashboardStats,
    getAllUsers,
    getAllDrivers,
    getAllMechanics,
    getAllRequests,
    getAnalytics
};
