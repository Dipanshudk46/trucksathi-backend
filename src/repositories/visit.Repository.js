const Visit = require('../models/visit.Model');

const create = async (data) => {
    return Visit.create(data);
};

const findRecentByVisitorId = async (visitorId, sinceDate) => {
    return Visit.findOne({
        visitorId,
        visitedAt: { $gte: sinceDate }
    });
};

const count = async (filter = {}) => {
    return Visit.countDocuments(filter);
};

const distinctVisitors = async (field = 'visitorId') => {
    return Visit.distinct(field);
};

const aggregateDailyTrend = async (sinceDate) => {
    return Visit.aggregate([
        { $match: { visitedAt: { $gte: sinceDate } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitedAt' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

module.exports = {
    create,
    findRecentByVisitorId,
    count,
    distinctVisitors,
    aggregateDailyTrend
};
