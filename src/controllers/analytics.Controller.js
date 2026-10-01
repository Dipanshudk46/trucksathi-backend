const AnalyticsService = require('../services/analytics.Service');
const asyncHandler = require('../utils/asyncHandler.Utils');

const recordVisit = asyncHandler(async (req, res) => {
    const { visitorId, path } = req.body;
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await AnalyticsService.recordVisit({
        visitorId,
        path,
        ip,
        userAgent
    });

    const statusCode = result.recorded ? 201 : 200;

    res.status(statusCode).json({
        success: true,
        recorded: result.recorded,
        message: result.message
    });
});

module.exports = {
    recordVisit
};
