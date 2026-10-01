const VisitRepository = require('../repositories/visit.Repository');
const AppError = require('../utils/AppError.Utils');
const { TIMING } = require('../config/constants.config');

// Record a visit with a 15-minute cooldown per visitor
const recordVisit = async ({ visitorId, path = '/', ip = '', userAgent = '' }) => {
    if (!visitorId || typeof visitorId !== 'string' || visitorId.trim() === '') {
        throw new AppError('Valid visitor identifier is required', 400, 'INVALID_VISITOR_ID');
    }

    const cleanVisitorId = visitorId.trim().slice(0, 100);
    const cleanPath = (path && typeof path === 'string') ? path.trim().slice(0, 150) : '/';
    const cleanUserAgent = userAgent ? String(userAgent).slice(0, 200) : '';
    const cleanIp = ip ? String(ip).replace(/^.*:/, '').slice(0, 50) : '';

    // Enforce 15-minute visitor cooldown window
    const cooldownThreshold = new Date(Date.now() - TIMING.VISITOR_COOLDOWN_MS);
    const recentVisit = await VisitRepository.findRecentByVisitorId(cleanVisitorId, cooldownThreshold);

    if (recentVisit) {
        return {
            recorded: false,
            message: 'Visit recorded previously within cooldown window'
        };
    }

    const newVisit = await VisitRepository.create({
        visitorId: cleanVisitorId,
        path: cleanPath,
        ip: cleanIp,
        userAgent: cleanUserAgent,
        visitedAt: new Date()
    });

    return {
        recorded: true,
        message: 'Visit recorded successfully',
        visit: newVisit
    };
};

const getUniqueVisitorCount = async () => {
    const uniqueList = await VisitRepository.distinctVisitors('visitorId');
    return uniqueList.length;
};

const getDailyTrends = async (days = 7) => {
    const now = new Date();
    const sinceDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const dailyAggregate = await VisitRepository.aggregateDailyTrend(sinceDate);

    const dailyMap = {};
    dailyAggregate.forEach((item) => {
        dailyMap[item._id] = item.count;
    });

    const dailyTrend = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        dailyTrend.push({
            date: dateStr,
            label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            visits: dailyMap[dateStr] || 0
        });
    }

    return dailyTrend;
};

const getAnalyticsSummary = async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
        totalVisits,
        todayVisits,
        weekVisits,
        monthVisits,
        uniqueVisitorsList,
        dailyTrend
    ] = await Promise.all([
        VisitRepository.count(),
        VisitRepository.count({ visitedAt: { $gte: startOfToday } }),
        VisitRepository.count({ visitedAt: { $gte: startOfWeek } }),
        VisitRepository.count({ visitedAt: { $gte: startOfMonth } }),
        VisitRepository.distinctVisitors('visitorId'),
        getDailyTrends(7)
    ]);

    return {
        summary: {
            totalVisits,
            todayVisits,
            weekVisits,
            monthVisits,
            uniqueVisitors: uniqueVisitorsList.length
        },
        dailyTrend
    };
};

module.exports = {
    recordVisit,
    getUniqueVisitorCount,
    getDailyTrends,
    getAnalyticsSummary
};
