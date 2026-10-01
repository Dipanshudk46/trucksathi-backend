const RequestRepository = require('../repositories/request.Repository');
const MechanicRepository = require('../repositories/mechanic.Repository');
const AppError = require('../utils/AppError.Utils');
const { TIMING } = require('../config/constants.config');

const expireOverduePendingRequests = async () => {
    const threshold = new Date(Date.now() - TIMING.PENDING_VALIDITY_MS);
    return RequestRepository.expirePendingBefore(threshold);
};

const createRequest = async ({ driverId, mechanicId, issue, vehicleInfo = '', location = {}, requestType = 'normal' }) => {
    const mechanic = await MechanicRepository.findById(mechanicId);
    if (!mechanic) {
        throw new AppError('Mechanic not found', 404, 'MECHANIC_NOT_FOUND');
    }

    if (mechanic.isAvailable === false) {
        throw new AppError('Selected mechanic is currently unavailable', 400, 'MECHANIC_UNAVAILABLE');
    }

    const newRequest = await RequestRepository.create({
        driverId,
        mechanicId,
        issue: issue.trim(),
        vehicleInfo: vehicleInfo ? vehicleInfo.trim() : '',
        requestType: requestType === 'emergency' ? 'emergency' : 'normal',
        location: {
            latitude: location?.latitude !== undefined && location?.latitude !== null ? parseFloat(location.latitude) : null,
            longitude: location?.longitude !== undefined && location?.longitude !== null ? parseFloat(location.longitude) : null,
            address: location?.address ? location.address.trim() : ''
        },
        status: 'pending'
    });

    const populated = await RequestRepository.findByIdWithDetails(newRequest._id);
    return populated;
};

const getMechanicRequests = async (mechanicId, status) => {
    await expireOverduePendingRequests();

    const filter = {};
    if (status) {
        filter.status = status;
    }

    return RequestRepository.findByMechanicId(mechanicId, filter);
};

const getDriverRequests = async (driverId) => {
    await expireOverduePendingRequests();
    return RequestRepository.findByDriverId(driverId);
};

const getRequestById = async (requestId, userId) => {
    await expireOverduePendingRequests();

    const request = await RequestRepository.findByIdWithDetails(requestId);
    if (!request) {
        throw new AppError('Service request not found', 404, 'REQUEST_NOT_FOUND');
    }

    // Ownership validation: must be creating driver or assigned mechanic
    const isDriver = request.driverId._id ? request.driverId._id.toString() === userId : request.driverId.toString() === userId;
    const isMechanic = request.mechanicId._id ? request.mechanicId._id.toString() === userId : request.mechanicId.toString() === userId;

    if (!isDriver && !isMechanic) {
        throw new AppError('Forbidden: You do not have access to this request', 403, 'FORBIDDEN');
    }

    return request;
};

const acceptRequest = async (requestId, mechanicId) => {
    const request = await RequestRepository.findById(requestId);
    if (!request) {
        throw new AppError('Service request not found', 404, 'REQUEST_NOT_FOUND');
    }

    // Ownership validation: verify request is assigned to authenticated mechanic
    if (request.mechanicId.toString() !== mechanicId) {
        throw new AppError('Forbidden: Request is assigned to another mechanic', 403, 'FORBIDDEN');
    }

    // Expiration check: if pending request is older than 30 minutes, transition to expired and reject
    const isOlderThan30Mins = (Date.now() - new Date(request.createdAt).getTime()) > TIMING.PENDING_VALIDITY_MS;
    if (request.status === 'expired' || (request.status === 'pending' && isOlderThan30Mins)) {
        await RequestRepository.updateStatus(requestId, 'expired', {
            expiredAt: request.expiredAt || new Date()
        });
        throw new AppError(
            'Request has expired as it was not accepted within the 30-minute validity window',
            400,
            'REQUEST_EXPIRED'
        );
    }

    // State transition validations
    if (request.status === 'accepted') {
        throw new AppError('Request has already been accepted', 409, 'ALREADY_ACCEPTED');
    }

    if (request.status === 'in_progress') {
        throw new AppError('Cannot accept request: assistance is already in progress', 400, 'INVALID_STATE_TRANSITION');
    }

    if (request.status === 'completed') {
        throw new AppError('Cannot accept request: assistance has already been completed', 400, 'INVALID_STATE_TRANSITION');
    }

    if (request.status !== 'pending') {
        throw new AppError(`Cannot accept request with status: ${request.status}`, 400, 'INVALID_STATE_TRANSITION');
    }

    const updated = await RequestRepository.updateStatus(requestId, 'accepted', {
        acceptedAt: new Date()
    });

    return updated;
};

const rejectRequest = async (requestId, mechanicId) => {
    const request = await RequestRepository.findById(requestId);
    if (!request) {
        throw new AppError('Service request not found', 404, 'REQUEST_NOT_FOUND');
    }

    // Ownership validation: verify request is assigned to authenticated mechanic
    if (request.mechanicId.toString() !== mechanicId) {
        throw new AppError('Forbidden: Request is assigned to another mechanic', 403, 'FORBIDDEN');
    }

    // Expiration check: if pending request is older than 30 minutes, transition to expired and reject
    const isOlderThan30Mins = (Date.now() - new Date(request.createdAt).getTime()) > TIMING.PENDING_VALIDITY_MS;
    if (request.status === 'expired' || (request.status === 'pending' && isOlderThan30Mins)) {
        await RequestRepository.updateStatus(requestId, 'expired', {
            expiredAt: request.expiredAt || new Date()
        });
        throw new AppError(
            'Request has expired as it was not accepted within the 30-minute validity window',
            400,
            'REQUEST_EXPIRED'
        );
    }

    // State transition validation
    if (request.status !== 'pending') {
        throw new AppError(`Cannot reject request with status: ${request.status}`, 400, 'INVALID_STATE_TRANSITION');
    }

    const updated = await RequestRepository.updateStatus(requestId, 'rejected');

    return updated;
};

const startRequest = async (requestId, mechanicId) => {
    const request = await RequestRepository.findById(requestId);
    if (!request) {
        throw new AppError('Service request not found', 404, 'REQUEST_NOT_FOUND');
    }

    // Ownership validation: verify request is assigned to authenticated mechanic
    if (request.mechanicId.toString() !== mechanicId) {
        throw new AppError('Forbidden: Request is assigned to another mechanic', 403, 'FORBIDDEN');
    }

    // State transition validations
    if (request.status === 'in_progress') {
        throw new AppError('Assistance is already in progress', 400, 'INVALID_STATE_TRANSITION');
    }

    if (request.status === 'completed') {
        throw new AppError('Cannot start assistance: job is already completed', 400, 'INVALID_STATE_TRANSITION');
    }

    if (request.status === 'cancelled' || request.status === 'expired') {
        throw new AppError(`Cannot start assistance on a ${request.status} request`, 400, 'INVALID_STATE_TRANSITION');
    }

    if (request.status !== 'accepted') {
        throw new AppError(
            `Request must be accepted before starting assistance (current status: ${request.status})`,
            400,
            'INVALID_STATE_TRANSITION'
        );
    }

    const updated = await RequestRepository.updateStatus(requestId, 'in_progress', {
        startedAt: new Date()
    });

    return updated;
};

const completeRequest = async (requestId, mechanicId) => {
    const request = await RequestRepository.findById(requestId);
    if (!request) {
        throw new AppError('Service request not found', 404, 'REQUEST_NOT_FOUND');
    }

    // Ownership validation: verify request is assigned to authenticated mechanic
    if (request.mechanicId.toString() !== mechanicId) {
        throw new AppError('Forbidden: Request is assigned to another mechanic', 403, 'FORBIDDEN');
    }

    // State transition validations: ONLY in_progress -> completed is allowed
    if (request.status === 'completed') {
        throw new AppError('Cannot complete request: assistance is already completed', 400, 'INVALID_STATE_TRANSITION');
    }

    if (request.status === 'accepted') {
        throw new AppError(
            'Cannot complete request directly from accepted status: assistance must first be started (status must be in_progress)',
            400,
            'INVALID_STATE_TRANSITION'
        );
    }

    if (request.status === 'pending') {
        throw new AppError('Cannot complete request: request must first be accepted and started', 400, 'INVALID_STATE_TRANSITION');
    }

    if (request.status === 'cancelled') {
        throw new AppError('Cannot complete request: request is cancelled', 400, 'INVALID_STATE_TRANSITION');
    }

    if (request.status === 'expired') {
        throw new AppError('Cannot complete request: request is expired', 400, 'INVALID_STATE_TRANSITION');
    }

    if (request.status !== 'in_progress') {
        throw new AppError(
            `Cannot complete request with status: ${request.status}. Request must be in_progress.`,
            400,
            'INVALID_STATE_TRANSITION'
        );
    }

    const updated = await RequestRepository.updateStatus(requestId, 'completed', {
        completedAt: new Date()
    });

    return updated;
};

const cancelRequest = async (requestId, userId) => {
    const request = await RequestRepository.findById(requestId);
    if (!request) {
        throw new AppError('Service request not found', 404, 'REQUEST_NOT_FOUND');
    }

    // Ownership validation: must be either creating driver or assigned mechanic
    const isMechanic = request.mechanicId.toString() === userId;
    const isDriver = request.driverId.toString() === userId;

    if (!isMechanic && !isDriver) {
        throw new AppError('Forbidden: You are not authorized to cancel this request', 403, 'FORBIDDEN');
    }

    // State validation: completed, cancelled, or expired requests cannot be cancelled
    if (request.status === 'completed') {
        throw new AppError('Cannot cancel a completed service request', 400, 'INVALID_STATE_TRANSITION');
    }

    if (request.status === 'cancelled') {
        throw new AppError('Request is already cancelled', 400, 'INVALID_STATE_TRANSITION');
    }

    if (request.status === 'expired') {
        throw new AppError('Cannot cancel an expired service request', 400, 'INVALID_STATE_TRANSITION');
    }

    const updated = await RequestRepository.updateStatus(requestId, 'cancelled', {
        cancelledAt: new Date(),
        cancelledBy: isMechanic ? 'mechanic' : 'driver'
    });

    return updated;
};

module.exports = {
    expireOverduePendingRequests,
    createRequest,
    getMechanicRequests,
    getDriverRequests,
    getRequestById,
    acceptRequest,
    rejectRequest,
    startRequest,
    completeRequest,
    cancelRequest
};
