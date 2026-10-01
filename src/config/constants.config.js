const ROLES = Object.freeze({
    DRIVER: 'driver',
    MECHANIC: 'mechanic',
    ADMIN: 'admin'
});

const REQUEST_STATUS = Object.freeze({
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    REJECTED: 'rejected',
    EXPIRED: 'expired'
});

const SUPPORTED_SERVICES = Object.freeze([
    'Engine Repair',
    'Tire Puncture & Replacement',
    'Battery & Electrical',
    'Brake Servicing',
    'Radiator & Cooling',
    'Highway Towing',
    'Clutch & Transmission'
]);

const TIMING = Object.freeze({
    PENDING_VALIDITY_MS: 30 * 60 * 1000, // 30 minutes window for pending requests
    VISITOR_COOLDOWN_MS: 15 * 60 * 1000  // 15 minutes debounce window for visitor tracking
});

const ERROR_CODES = Object.freeze({
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    EMAIL_EXISTS: 'EMAIL_EXISTS',
    PHONE_EXISTS: 'PHONE_EXISTS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    REQUEST_NOT_FOUND: 'REQUEST_NOT_FOUND',
    MECHANIC_NOT_FOUND: 'MECHANIC_NOT_FOUND',
    MECHANIC_UNAVAILABLE: 'MECHANIC_UNAVAILABLE',
    ALREADY_ACCEPTED: 'ALREADY_ACCEPTED',
    INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
    REQUEST_EXPIRED: 'REQUEST_EXPIRED',
    ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
});

module.exports = {
    ROLES,
    REQUEST_STATUS,
    SUPPORTED_SERVICES,
    TIMING,
    ERROR_CODES
};

