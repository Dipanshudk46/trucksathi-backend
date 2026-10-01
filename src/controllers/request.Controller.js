const RequestService = require('../services/request.Service');
const asyncHandler = require('../utils/asyncHandler.Utils');

const createRequest = asyncHandler(async (req, res) => {
    const { mechanicId, issue, vehicleInfo, location, requestType } = req.body;

    const request = await RequestService.createRequest({
        driverId: req.user.id,
        mechanicId,
        issue,
        vehicleInfo,
        location,
        requestType
    });

    res.status(201).json({
        success: true,
        message: 'Service request created successfully',
        data: request
    });
});

const getMechanicRequests = asyncHandler(async (req, res) => {
    const requests = await RequestService.getMechanicRequests(req.user.id, req.query.status);

    res.status(200).json({
        success: true,
        count: requests.length,
        data: requests
    });
});

const getDriverRequests = asyncHandler(async (req, res) => {
    const requests = await RequestService.getDriverRequests(req.user.id);

    res.status(200).json({
        success: true,
        count: requests.length,
        data: requests
    });
});

const getRequestById = asyncHandler(async (req, res) => {
    const request = await RequestService.getRequestById(req.params.requestId, req.user.id);

    res.status(200).json({
        success: true,
        data: request
    });
});

const acceptRequest = asyncHandler(async (req, res) => {
    const request = await RequestService.acceptRequest(req.params.requestId, req.user.id);

    res.status(200).json({
        success: true,
        message: 'Service request accepted successfully',
        data: request
    });
});

const rejectRequest = asyncHandler(async (req, res) => {
    const request = await RequestService.rejectRequest(req.params.requestId, req.user.id);

    res.status(200).json({
        success: true,
        message: 'Service request rejected successfully',
        data: request
    });
});

const startRequest = asyncHandler(async (req, res) => {
    const request = await RequestService.startRequest(req.params.requestId, req.user.id);

    res.status(200).json({
        success: true,
        message: 'Assistance started successfully',
        data: request
    });
});

const completeRequest = asyncHandler(async (req, res) => {
    const request = await RequestService.completeRequest(req.params.requestId, req.user.id);

    res.status(200).json({
        success: true,
        message: 'Assistance marked as completed successfully',
        data: request
    });
});

const cancelRequest = asyncHandler(async (req, res) => {
    const request = await RequestService.cancelRequest(req.params.requestId, req.user.id);

    res.status(200).json({
        success: true,
        message: 'Service request cancelled successfully',
        data: request
    });
});

module.exports = {
    createRequest,
    getMechanicRequests,
    acceptRequest,
    rejectRequest,
    startRequest,
    completeRequest,
    cancelRequest,
    getDriverRequests,
    getRequestById
};
