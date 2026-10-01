const DriverRepository = require('../repositories/driver.Repository');
const MechanicRepository = require('../repositories/mechanic.Repository');
const RequestRepository = require('../repositories/request.Repository');
const VisitRepository = require('../repositories/visit.Repository');
const AnalyticsService = require('./analytics.Service');
const { TIMING } = require('../config/constants.config');

const getDashboardStats = async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
        totalDrivers,
        totalMechanics,
        totalRequests,
        pendingRequests,
        acceptedRequests,
        inProgressRequests,
        completedRequests,
        cancelledRequests,
        expiredRequests,
        totalVisits,
        todayVisits,
        uniqueVisitorsList
    ] = await Promise.all([
        DriverRepository.count(),
        MechanicRepository.count(),
        RequestRepository.count(),
        RequestRepository.count({ status: 'pending' }),
        RequestRepository.count({ status: 'accepted' }),
        RequestRepository.count({ status: 'in_progress' }),
        RequestRepository.count({ status: 'completed' }),
        RequestRepository.count({ status: { $in: ['cancelled', 'rejected'] } }),
        RequestRepository.count({ status: 'expired' }),
        VisitRepository.count(),
        VisitRepository.count({ visitedAt: { $gte: startOfToday } }),
        VisitRepository.distinctVisitors('visitorId')
    ]);

    return {
        users: {
            total: totalDrivers + totalMechanics,
            drivers: totalDrivers,
            mechanics: totalMechanics
        },
        requests: {
            total: totalRequests,
            pending: pendingRequests,
            accepted: acceptedRequests,
            in_progress: inProgressRequests,
            completed: completedRequests,
            cancelled: cancelledRequests,
            expired: expiredRequests
        },
        visits: {
            total: totalVisits,
            unique: uniqueVisitorsList.length,
            today: todayVisits
        }
    };
};

const getAllUsers = async ({ role, search } = {}) => {
    let drivers = [];
    let mechanics = [];

    const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = search && String(search).trim() ? new RegExp(escapeRegex(String(search).trim()), 'i') : null;

    if (!role || role === 'driver') {
        const driverQuery = searchRegex
            ? { $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }] }
            : {};
        drivers = await DriverRepository.find(driverQuery);
    }

    if (!role || role === 'mechanic') {
        const mechanicQuery = searchRegex
            ? { $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }, { shopName: searchRegex }] }
            : {};
        mechanics = await MechanicRepository.find(mechanicQuery);
    }

    const formattedDrivers = drivers.map((d) => ({
        _id: d._id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        role: 'driver',
        status: 'Active',
        createdAt: d.createdAt,
        extra: null
    }));

    const formattedMechanics = mechanics.map((m) => ({
        _id: m._id,
        name: m.name,
        email: m.email,
        phone: m.phone,
        role: 'mechanic',
        status: m.isAvailable ? 'Online' : 'Offline',
        createdAt: m.createdAt,
        extra: {
            shopName: m.shopName,
            services: m.services,
            isAvailable: m.isAvailable
        }
    }));

    return [...formattedDrivers, ...formattedMechanics].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
};

const getAllDrivers = async () => {
    const drivers = await DriverRepository.find();
    const driverIds = drivers.map((d) => d._id);

    const requestCounts = await RequestRepository.countByDriverIds(driverIds);

    const countMap = {};
    requestCounts.forEach((rc) => {
        countMap[rc._id.toString()] = rc.count;
    });

    return drivers.map((d) => ({
        ...d,
        requestCount: countMap[d._id.toString()] || 0
    }));
};

const getAllMechanics = async () => {
    const mechanics = await MechanicRepository.find();
    const mechanicIds = mechanics.map((m) => m._id);

    const requestCounts = await RequestRepository.countByMechanicIds(mechanicIds);

    const countMap = {};
    requestCounts.forEach((rc) => {
        countMap[rc._id.toString()] = rc.count;
    });

    return mechanics.map((m) => ({
        ...m,
        requestCount: countMap[m._id.toString()] || 0
    }));
};

const getAllRequests = async ({ status } = {}) => {
    const threshold = new Date(Date.now() - TIMING.PENDING_VALIDITY_MS);
    await RequestRepository.expirePendingBefore(threshold);

    const filter = {};
    if (status && status !== 'all') {
        filter.status = status;
    }

    return RequestRepository.find(filter);
};

const getAnalytics = async () => {
    return AnalyticsService.getAnalyticsSummary();
};

module.exports = {
    getDashboardStats,
    getAllUsers,
    getAllDrivers,
    getAllMechanics,
    getAllRequests,
    getAnalytics
};
