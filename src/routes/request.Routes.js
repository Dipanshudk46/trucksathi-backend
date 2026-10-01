const express = require('express');
const router = express.Router();

const {
    createRequest,
    getMechanicRequests,
    acceptRequest,
    rejectRequest,
    startRequest,
    completeRequest,
    cancelRequest,
    getDriverRequests,
    getRequestById
} = require('../controllers/request.Controller');

const authMiddleware = require('../middleware/auth.Middleware');
const authorize = require('../middleware/authorize.Middleware');
const validate = require('../validators/validate');
const {
    createRequestSchema,
    requestIdParamSchema
} = require('../validators/request.Validator');

// Driver Routes
router.post(
    '/requests',
    authMiddleware,
    authorize(['driver']),
    validate(createRequestSchema),
    createRequest
);

router.get(
    '/requests/driver',
    authMiddleware,
    authorize(['driver']),
    getDriverRequests
);

// Mechanic Request Queue
router.get(
    '/requests/mechanic',
    authMiddleware,
    authorize(['mechanic']),
    getMechanicRequests
);

// Mechanic Lifecycle Actions: accept & reject
router.patch(
    '/requests/:requestId/accept',
    authMiddleware,
    authorize(['mechanic']),
    validate(requestIdParamSchema, 'params'),
    acceptRequest
);
router.post(
    '/requests/:requestId/accept',
    authMiddleware,
    authorize(['mechanic']),
    validate(requestIdParamSchema, 'params'),
    acceptRequest
);

router.patch(
    '/requests/:requestId/reject',
    authMiddleware,
    authorize(['mechanic']),
    validate(requestIdParamSchema, 'params'),
    rejectRequest
);
router.post(
    '/requests/:requestId/reject',
    authMiddleware,
    authorize(['mechanic']),
    validate(requestIdParamSchema, 'params'),
    rejectRequest
);

// Mechanic Lifecycle Actions: start & complete
router.patch(
    '/requests/:requestId/start',
    authMiddleware,
    authorize(['mechanic']),
    validate(requestIdParamSchema, 'params'),
    startRequest
);
router.post(
    '/requests/:requestId/start',
    authMiddleware,
    authorize(['mechanic']),
    validate(requestIdParamSchema, 'params'),
    startRequest
);

router.patch(
    '/requests/:requestId/complete',
    authMiddleware,
    authorize(['mechanic']),
    validate(requestIdParamSchema, 'params'),
    completeRequest
);
router.post(
    '/requests/:requestId/complete',
    authMiddleware,
    authorize(['mechanic']),
    validate(requestIdParamSchema, 'params'),
    completeRequest
);

// Cancellation (accessible by assigned mechanic or requesting driver)
router.patch(
    '/requests/:requestId/cancel',
    authMiddleware,
    authorize(['mechanic', 'driver']),
    validate(requestIdParamSchema, 'params'),
    cancelRequest
);
router.post(
    '/requests/:requestId/cancel',
    authMiddleware,
    authorize(['mechanic', 'driver']),
    validate(requestIdParamSchema, 'params'),
    cancelRequest
);

// Shared Route (accessible by driver or assigned mechanic)
router.get(
    '/requests/:requestId',
    authMiddleware,
    authorize(['driver', 'mechanic']),
    validate(requestIdParamSchema, 'params'),
    getRequestById
);

module.exports = router;
