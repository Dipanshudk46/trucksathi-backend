const express = require('express');
const router = express.Router();

const {
    adminLogin,
    getDashboardStats,
    getAllUsers,
    getAllDrivers,
    getAllMechanics,
    getAllRequests,
    getAnalytics
} = require('../controllers/admin.Controller');

const authMiddleware = require('../middleware/auth.Middleware');
const authorize = require('../middleware/authorize.Middleware');
const validate = require('../validators/validate');
const { adminLoginSchema } = require('../validators/auth.Validator');

// Public Admin Authentication
router.post('/login', validate(adminLoginSchema), adminLogin);

// Protected Admin Endpoints
router.get('/dashboard', authMiddleware, authorize(['admin']), getDashboardStats);
router.get('/users', authMiddleware, authorize(['admin']), getAllUsers);
router.get('/drivers', authMiddleware, authorize(['admin']), getAllDrivers);
router.get('/mechanics', authMiddleware, authorize(['admin']), getAllMechanics);
router.get('/requests', authMiddleware, authorize(['admin']), getAllRequests);
router.get('/analytics', authMiddleware, authorize(['admin']), getAnalytics);

module.exports = router;
