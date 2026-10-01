/**
 * TruckSathi Step 7: Routes + Middleware Integration Test Suite
 * Validates request flow:
 * HTTP Request -> Route -> Authentication -> Authorization -> Validation -> Controller -> Service -> Repository -> MongoDB
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');

const connectDB = require('../src/config/db.config');

// Routes under test (canonical src/routes/)
const authRouter = require('../src/routes/auth.Routes');
const driverRoutes = require('../src/routes/driver.Routes');
const mechanicRoutes = require('../src/routes/mechanic.Routes');
const requestRoutes = require('../src/routes/request.Routes');
const adminRoutes = require('../src/routes/admin.Routes');
const analyticsRoutes = require('../src/routes/analytics.Routes');

// Models for fixture cleanup
const Driver = require('../src/models/driver.Model');
const Mechanic = require('../src/models/mechanic.Model');
const ServiceRequest = require('../src/models/serviceRequest.Model');
const Visit = require('../src/models/visit.Model');
const Admin = require('../src/models/admin.Model');
const PasswordHelper = require('../src/utils/passwordHelper.Utils');

let passedCount = 0;
let failedCount = 0;

function assert(description, condition, details = '') {
    if (condition) {
        console.log(`  ✓ [PASS] ${description}`);
        passedCount++;
    } else {
        console.error(`  ✗ [FAIL] ${description} ${details ? '- ' + details : ''}`);
        failedCount++;
    }
}

async function request(serverUrl, method, pathName, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${serverUrl}${pathName}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json().catch(() => null);
    return { status: res.status, data };
}

async function runRoutesMiddlewareTestSuite() {
    console.log('\nRunning Routes & Middleware Tests...\n');

    await connectDB();

    // Ensure system admin exists with known credentials
    const adminEmail = 'admin@trucksathi.com';
    const adminPass = 'Admin@123';
    let adminUser = await Admin.findOne({ email: adminEmail });
    if (!adminUser) {
        const hashed = await PasswordHelper.hashPassword(adminPass, 10);
        adminUser = await Admin.create({
            name: 'System Administrator',
            email: adminEmail,
            password: hashed,
            role: 'admin'
        });
    } else {
        adminUser.password = await PasswordHelper.hashPassword(adminPass, 10);
        await adminUser.save();
    }

    // Build Express app instance mirroring server.js
    const app = express();
    app.use(express.json());
    app.use(cors());

    app.use('/api', driverRoutes);
    app.use('/api/auth', authRouter);
    app.use('/api', mechanicRoutes);
    app.use('/api', requestRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/analytics', analyticsRoutes);

    app.get('/', (req, res) => {
        res.send('Server is running');
    });

    const errorHandler = require('../src/middleware/errorHandler.Middleware');
    app.use(errorHandler);

    const testPort = 3007;
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(testPort, resolve));
    const BASE_URL = `http://localhost:${testPort}`;
    console.log(`Routes/Middleware test server running at ${BASE_URL}\n`);

    const timestamp = Date.now();
    const testTag = `rt_${timestamp}`;

    const createdDriverIds = [];
    const createdMechanicIds = [];
    const createdRequestIds = [];
    const testVisitorIds = [];

    try {
        // ====================================================
        // 1. PUBLIC ROUTES & VALIDATION-FIRST VERIFICATION
        // ====================================================
        console.log('\n--- 1. Public Routes & Validation Execution Order ---');

        const driverEmail = `${testTag}_driver@trucksathi.test`;
        const driverPhone = `9${String(timestamp).slice(-9)}`;
        const driverPass = 'StrongPassword@123';

        // 1.1 Valid public driver registration succeeds
        const validRegRes = await request(BASE_URL, 'POST', '/api/auth/driver/register', {
            name: 'Route Test Driver',
            email: driverEmail,
            phone: driverPhone,
            password: driverPass
        });
        assert('Public route POST /api/auth/driver/register works without token (201)',
            validRegRes.status === 201 && validRegRes.data?.message === 'User registered successfully');
        if (validRegRes.data?.driver?._id) createdDriverIds.push(validRegRes.data.driver._id);

        // 1.2 Invalid public registration is blocked by validation before controller execution
        const invalidRegRes = await request(BASE_URL, 'POST', '/api/auth/driver/register', {
            name: 'Invalid Driver',
            email: 'invalid-email-format',
            phone: '123',
            password: 'short'
        });
        assert('Invalid public input rejected by Joi validation before controller (400)',
            invalidRegRes.status === 400 && invalidRegRes.data?.message);

        // Verify that no document was inserted into MongoDB for this invalid attempt
        const phantomDoc = await Driver.findOne({ name: 'Invalid Driver' });
        assert('Validation strictly stops execution before database or controller operations',
            phantomDoc === null);

        // 1.3 Public visitor beacon
        const visitorId = `visitor_rt_${timestamp}`;
        testVisitorIds.push(visitorId);
        const visitorRes = await request(BASE_URL, 'POST', '/api/analytics/visit', {
            visitorId,
            path: '/find-mechanic'
        });
        assert('Public route POST /api/analytics/visit works without token (201)',
            visitorRes.status === 201 && visitorRes.data?.recorded === true);

        // 1.4 Invalid visitor beacon rejected by validation
        const badVisitorRes = await request(BASE_URL, 'POST', '/api/analytics/visit', {
            visitorId: ''
        });
        assert('Invalid visitor beacon rejected with 400 VALIDATION_ERROR',
            badVisitorRes.status === 400);

        // 1.5 Valid driver login to acquire token
        const driverLoginRes = await request(BASE_URL, 'POST', '/api/auth/driver/login', {
            email: driverEmail,
            password: driverPass
        });
        const driverToken = driverLoginRes.data?.token;
        assert('Driver login returns valid JWT token (200)',
            driverLoginRes.status === 200 && !!driverToken);

        // 1.6 Mechanic registration and login
        const mechEmail = `${testTag}_mech@trucksathi.test`;
        const mechPhone = `8${String(timestamp).slice(-9)}`;
        const mechPass = 'MechanicPassword@123';

        const mechRegRes = await request(BASE_URL, 'POST', '/api/auth/mechanic/register', {
            name: 'Route Test Mechanic',
            email: mechEmail,
            phone: mechPhone,
            password: mechPass,
            shopName: 'Highway Workshop',
            services: ['Engine Repair', 'Brake Servicing'],
            location: { lat: 28.6139, lng: 77.2090 }
        });
        assert('Public route POST /api/auth/mechanic/register works without token (201)',
            mechRegRes.status === 201 && mechRegRes.data?.success === true);
        if (mechRegRes.data?.data?._id) createdMechanicIds.push(mechRegRes.data.data._id);

        const mechLoginRes = await request(BASE_URL, 'POST', '/api/auth/mechanic/login', {
            email: mechEmail,
            password: mechPass
        });
        const mechToken = mechLoginRes.data?.token;
        assert('Mechanic login returns valid JWT token (200)',
            mechLoginRes.status === 200 && !!mechToken);

        // 1.7 Admin login
        const adminLoginRes = await request(BASE_URL, 'POST', '/api/admin/login', {
            email: adminEmail,
            password: adminPass
        });
        const adminToken = adminLoginRes.data?.token;
        assert('Public route POST /api/admin/login returns valid admin JWT token (200)',
            adminLoginRes.status === 200 && !!adminToken);

        // ====================================================
        // 2. AUTHENTICATION MIDDLEWARE VERIFICATION
        // ====================================================
        console.log('\n--- 2. Authentication Middleware Tests ---');

        // 2.1 Missing token on protected endpoint rejected with 401
        const missingTokenRes = await request(BASE_URL, 'GET', '/api/driver/profile', null, null);
        assert('Protected endpoint without token returns 401 (No token, access denied)',
            missingTokenRes.status === 401 && missingTokenRes.data?.message === 'No token, access denied');

        // 2.2 Invalid/Malformed token rejected with 403
        const invalidTokenRes = await request(BASE_URL, 'GET', '/api/driver/profile', null, 'malformed.jwt.token');
        assert('Protected endpoint with invalid token returns 403 (Invalid token)',
            invalidTokenRes.status === 403 && invalidTokenRes.data?.message === 'Invalid token');

        // 2.3 Valid token accepted
        const validTokenRes = await request(BASE_URL, 'GET', '/api/driver/profile', null, driverToken);
        assert('Protected endpoint with valid token succeeds (200)',
            validTokenRes.status === 200 && validTokenRes.data?.email === driverEmail);

        // ====================================================
        // 3. AUTHORIZATION MIDDLEWARE & ROLE ACCESS VERIFICATION
        // ====================================================
        console.log('\n--- 3. Authorization Middleware & Role-Based Access ---');

        // 3.1 Driver can access driver-only profile
        const driverAccessRes = await request(BASE_URL, 'GET', '/api/driver/profile', null, driverToken);
        assert('Driver can access driver-protected route GET /api/driver/profile (200)',
            driverAccessRes.status === 200);

        // 3.2 Mechanic cannot access driver-only profile (403 Forbidden)
        const mechAccessDriverRes = await request(BASE_URL, 'GET', '/api/driver/profile', null, mechToken);
        assert('Mechanic attempting to access driver route rejected with 403 (Forbidden)',
            mechAccessDriverRes.status === 403 && mechAccessDriverRes.data?.message === 'Forbidden');

        // 3.3 Mechanic can access mechanic-only profile
        const mechAccessRes = await request(BASE_URL, 'GET', '/api/mechanic/profile', null, mechToken);
        assert('Mechanic can access mechanic-protected route GET /api/mechanic/profile (200)',
            mechAccessRes.status === 200);

        // 3.4 Driver cannot access mechanic-only profile (403 Forbidden)
        const driverAccessMechRes = await request(BASE_URL, 'GET', '/api/mechanic/profile', null, driverToken);
        assert('Driver attempting to access mechanic route rejected with 403 (Forbidden)',
            driverAccessMechRes.status === 403 && driverAccessMechRes.data?.message === 'Forbidden');

        // 3.5 Driver cannot access mechanic availability update (403 Forbidden)
        const driverAvailAttempt = await request(BASE_URL, 'PATCH', '/api/mechanic/availability', { isAvailable: true }, driverToken);
        assert('Driver attempting to toggle mechanic availability rejected with 403 (Forbidden)',
            driverAvailAttempt.status === 403);

        // 3.6 Admin routes role enforcement
        const adminDashboardRes = await request(BASE_URL, 'GET', '/api/admin/dashboard', null, adminToken);
        assert('Admin successfully accesses GET /api/admin/dashboard (200)',
            adminDashboardRes.status === 200 && adminDashboardRes.data?.data?.users);

        const driverAdminRes = await request(BASE_URL, 'GET', '/api/admin/dashboard', null, driverToken);
        assert('Driver attempting to access admin route rejected with 403 (Forbidden)',
            driverAdminRes.status === 403);

        const mechAdminRes = await request(BASE_URL, 'GET', '/api/admin/dashboard', null, mechToken);
        assert('Mechanic attempting to access admin route rejected with 403 (Forbidden)',
            mechAdminRes.status === 403);

        // ====================================================
        // 4. REQUEST ROUTES LIFECYCLE & MIDDLEWARE ORDER
        // ====================================================
        console.log('\n--- 4. Request Routes & Middleware Flow ---');

        // 4.1 Authenticated driver creates request
        const createReqRes = await request(BASE_URL, 'POST', '/api/requests', {
            mechanicId: mechRegRes.data.data._id,
            issue: 'Alternator failure near border',
            vehicleInfo: 'BharatBenz 2823R',
            location: { latitude: 28.6140, longitude: 77.2091, address: 'State Highway 12' }
        }, driverToken);
        assert('Driver creates request via POST /api/requests (201)',
            createReqRes.status === 201 && createReqRes.data?.data?._id);
        const requestId = createReqRes.data?.data?._id;
        if (requestId) createdRequestIds.push(requestId);

        // 4.2 Mechanic accepts request
        const acceptReqRes = await request(BASE_URL, 'PATCH', `/api/requests/${requestId}/accept`, {}, mechToken);
        assert('Assigned mechanic accepts request via PATCH /api/requests/:id/accept (200)',
            acceptReqRes.status === 200 && acceptReqRes.data?.data?.status === 'accepted');

        // 4.3 Mechanic starts assistance
        const startReqRes = await request(BASE_URL, 'PATCH', `/api/requests/${requestId}/start`, {}, mechToken);
        assert('Assigned mechanic starts request via PATCH /api/requests/:id/start (200)',
            startReqRes.status === 200 && startReqRes.data?.data?.status === 'in_progress');

        // 4.4 Mechanic completes assistance
        const completeReqRes = await request(BASE_URL, 'PATCH', `/api/requests/${requestId}/complete`, {}, mechToken);
        assert('Assigned mechanic completes request via PATCH /api/requests/:id/complete (200)',
            completeReqRes.status === 200 && completeReqRes.data?.data?.status === 'completed');

        // 4.5 Service-level state machine rules remain intact
        const reCompleteRes = await request(BASE_URL, 'PATCH', `/api/requests/${requestId}/complete`, {}, mechToken);
        assert('Completed request cannot be completed again; service rule preserved (400)',
            reCompleteRes.status === 400);

        // ====================================================
        // 5. VALIDATION MIDDLEWARE COVERAGE
        // ====================================================
        console.log('\n--- 5. Granular Validation Edge Cases ---');

        // 5.1 Missing required field on request creation
        const missingIssueRes = await request(BASE_URL, 'POST', '/api/requests', {
            mechanicId: mechRegRes.data.data._id
            // missing issue
        }, driverToken);
        assert('Validation rejects create request missing required "issue" field (400)',
            missingIssueRes.status === 400 && missingIssueRes.data?.message?.includes('Issue'));

        // 5.2 Invalid ObjectId format in route parameter
        const badParamRes = await request(BASE_URL, 'PATCH', '/api/requests/not-an-object-id/accept', {}, mechToken);
        assert('Validation rejects invalid ObjectId in URL parameter (400)',
            badParamRes.status === 400 && badParamRes.data?.message?.includes('request ID format'));

        // 5.3 Invalid coordinates in nearby search query
        const badCoordsRes = await request(BASE_URL, 'GET', '/api/nearby?lat=999&lng=77.2090', null, driverToken);
        assert('Validation rejects out-of-range latitude in query params (400)',
            badCoordsRes.status === 400 && badCoordsRes.data?.message?.includes('Latitude'));

        // 5.4 Invalid phone format in driver registration
        const badPhoneRes = await request(BASE_URL, 'POST', '/api/auth/driver/register', {
            name: 'Bad Phone Driver',
            email: `bad_phone_${timestamp}@trucksathi.test`,
            phone: '12345', // not 10 digits
            password: 'ValidPassword@123'
        });
        assert('Validation rejects phone numbers not matching 10 digits (400)',
            badPhoneRes.status === 400 && badPhoneRes.data?.message?.includes('phone'));

        // 5.5 Invalid email format in mechanic registration
        const badEmailRes = await request(BASE_URL, 'POST', '/api/auth/mechanic/register', {
            name: 'Bad Email Mech',
            email: 'not-an-email-at-all',
            phone: '9876543210',
            password: 'ValidPassword@123',
            shopName: 'Bad Email Shop',
            services: ['Engine Repair'],
            location: { lat: 28.6139, lng: 77.2090 }
        });
        assert('Validation rejects invalid email format (400)',
            badEmailRes.status === 400 && badEmailRes.data?.message?.includes('Email'));

        // 5.6 Invalid availability value in mechanic availability update
        const badAvailRes = await request(BASE_URL, 'PATCH', '/api/mechanic/availability', {
            isAvailable: 'invalid_non_boolean'
        }, mechToken);
        assert('Validation rejects non-boolean isAvailable value (400)',
            badAvailRes.status === 400 && badAvailRes.data?.message?.includes('isAvailable'));

    } catch (testError) {
        console.error('\n[FATAL ERROR IN ROUTE/MIDDLEWARE TEST SUITE]:', testError);
        failedCount++;
    } finally {
        console.log('\n--- Cleaning Up Test Fixtures ---');
        try {
            if (createdRequestIds.length > 0) {
                await ServiceRequest.deleteMany({ _id: { $in: createdRequestIds } });
            }
            if (createdDriverIds.length > 0) {
                await Driver.deleteMany({ _id: { $in: createdDriverIds } });
            }
            if (createdMechanicIds.length > 0) {
                await Mechanic.deleteMany({ _id: { $in: createdMechanicIds } });
            }
            if (testVisitorIds.length > 0) {
                await Visit.deleteMany({ visitorId: { $in: testVisitorIds } });
            }
            console.log('Cleanup completed successfully.');
        } catch (cleanupErr) {
            console.error('Cleanup error:', cleanupErr.message);
        }

        await new Promise((resolve) => server.close(resolve));
        await mongoose.connection.close();
    }

    console.log('\n======================================================');
    console.log(`ROUTE/MIDDLEWARE TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

    if (failedCount > 0) {
        process.exit(1);
    }
}

runRoutesMiddlewareTestSuite();
