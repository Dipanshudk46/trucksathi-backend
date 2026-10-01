/**
 * TruckSathi Controller Layer HTTP Smoke Test Suite
 * Spins up Express app instance and tests all migrated controller endpoints over HTTP.
 * Verifies exact status codes, JSON payload fields, authentication, and error propagation.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');

const connectDB = require('../src/config/db.config');
const seedDefaultAdmin = require('../src/config/seedAdmin.config');

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

async function runControllerTestSuite() {
    console.log('\nRunning Controller Tests...\n');

    await connectDB();
    await seedDefaultAdmin();

    // Create an isolated test server using the exact same app structure
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

    const testPort = 3008;
    const server = http.createServer(app);

    await new Promise((resolve) => server.listen(testPort, resolve));
    const BASE_URL = `http://localhost:${testPort}`;
    console.log(`Test server running at ${BASE_URL}\n`);

    const timestamp = Date.now();
    const testTag = `ctrl_${timestamp}`;

    const createdDriverIds = [];
    const createdMechanicIds = [];
    const createdRequestIds = [];
    const testVisitorIds = [];

    try {
        // ====================================================
        // 0. Base route verification
        // ====================================================
        const baseRes = await fetch(`${BASE_URL}/`);
        const baseText = await baseRes.text();
        assert('GET / returns 200 with "Server is running"',
            baseRes.status === 200 && baseText === 'Server is running');

        // ====================================================
        // 1. Authentication Controller Endpoints
        // ====================================================
        console.log('\n--- 1. Auth Endpoints via Controller ---');

        const driverEmail = `${testTag}_driver@trucksathi.test`;
        const driverPhone = `9${String(timestamp).slice(-9)}`;
        const driverPassword = 'DriverPassword@123';

        // 1.1 Driver registration (POST /api/auth/driver/register)
        const driverRegRes = await request(BASE_URL, 'POST', '/api/auth/driver/register', {
            name: 'Controller Driver',
            email: driverEmail,
            phone: driverPhone,
            password: driverPassword
        });
        assert('POST /api/auth/driver/register returns 201 with success message',
            driverRegRes.status === 201 && driverRegRes.data?.message === 'User registered successfully');

        if (driverRegRes.data?.driver?._id) {
            createdDriverIds.push(driverRegRes.data.driver._id);
        }

        // 1.2 Driver login (POST /api/auth/driver/login)
        const driverLoginRes = await request(BASE_URL, 'POST', '/api/auth/driver/login', {
            email: driverEmail,
            password: driverPassword
        });
        const driverToken = driverLoginRes.data?.token;
        assert('POST /api/auth/driver/login returns 200 with JWT token and user info',
            driverLoginRes.status === 200 && driverToken && driverLoginRes.data?.user?.role === 'driver');

        // 1.3 Driver login with invalid password returns 400
        const badLoginRes = await request(BASE_URL, 'POST', '/api/auth/driver/login', {
            email: driverEmail,
            password: 'WrongPassword@999'
        });
        assert('POST /api/auth/driver/login with bad password returns 400 JSON error',
            badLoginRes.status === 400 && badLoginRes.data?.message === 'Invalid credentials');

        // 1.4 Mechanic registration (POST /api/auth/mechanic/register)
        const mechEmail = `${testTag}_mech@trucksathi.test`;
        const mechPhone = `8${String(timestamp).slice(-9)}`;
        const mechPassword = 'MechanicPassword@123';

        const mechRegRes = await request(BASE_URL, 'POST', '/api/auth/mechanic/register', {
            name: 'Controller Mechanic',
            email: mechEmail,
            phone: mechPhone,
            password: mechPassword,
            shopName: 'Metro Workshop',
            services: ['Engine Repair', 'Brake Servicing'],
            location: { lat: 28.6139, lng: 77.2090 }
        });
        assert('POST /api/auth/mechanic/register returns 201 with success: true and data',
            mechRegRes.status === 201 && mechRegRes.data?.success === true && mechRegRes.data?.data?._id);

        if (mechRegRes.data?.data?._id) {
            createdMechanicIds.push(mechRegRes.data.data._id);
        }

        // 1.5 Mechanic login (POST /api/auth/mechanic/login)
        const mechLoginRes = await request(BASE_URL, 'POST', '/api/auth/mechanic/login', {
            email: mechEmail,
            password: mechPassword
        });
        const mechToken = mechLoginRes.data?.token;
        assert('POST /api/auth/mechanic/login returns 200 with JWT token and mechanic role',
            mechLoginRes.status === 200 && mechToken && mechLoginRes.data?.user?.role === 'mechanic');

        // 1.6 Admin login (POST /api/admin/login)
        const Admin = require('../src/models/admin.Model');
        const PasswordHelper = require('../src/utils/passwordHelper.Utils');
        const adminPass = 'Admin@123';
        let adminUser = await Admin.findOne({ email: 'admin@trucksathi.com' });
        if (!adminUser) {
            const hashedAdminPass = await PasswordHelper.hashPassword(adminPass, 10);
            adminUser = await Admin.create({
                name: 'System Administrator',
                email: 'admin@trucksathi.com',
                password: hashedAdminPass,
                role: 'admin'
            });
        } else {
            adminUser.password = await PasswordHelper.hashPassword(adminPass, 10);
            await adminUser.save();
        }

        const adminLoginRes = await request(BASE_URL, 'POST', '/api/admin/login', {
            email: 'admin@trucksathi.com',
            password: adminPass
        });
        const adminToken = adminLoginRes.data?.token;
        assert('POST /api/admin/login returns 200 with JWT token and admin role',
            adminLoginRes.status === 200 && adminToken && adminLoginRes.data?.user?.role === 'admin');

        // ====================================================
        // 2. Driver Controller Endpoints
        // ====================================================
        console.log('\n--- 2. Driver Endpoints via Controller ---');

        // 2.1 GET /api/driver/profile
        const driverProfileRes = await request(BASE_URL, 'GET', '/api/driver/profile', null, driverToken);
        assert('GET /api/driver/profile returns 200 with driver profile without password',
            driverProfileRes.status === 200 && driverProfileRes.data?.email === driverEmail && !driverProfileRes.data?.password);

        // 2.2 PUT /api/update/driver/profile
        const driverUpdateRes = await request(BASE_URL, 'PUT', '/api/update/driver/profile', {
            name: 'Updated Driver Name'
        }, driverToken);
        assert('PUT /api/update/driver/profile returns 200 with updated driver info',
            driverUpdateRes.status === 200 && driverUpdateRes.data?.driver?.name === 'Updated Driver Name');

        // ====================================================
        // 3. Mechanic Controller Endpoints
        // ====================================================
        console.log('\n--- 3. Mechanic Endpoints via Controller ---');

        // 3.1 GET /api/mechanic/profile
        const mechProfileRes = await request(BASE_URL, 'GET', '/api/mechanic/profile', null, mechToken);
        assert('GET /api/mechanic/profile returns 200 with mechanic profile without password',
            mechProfileRes.status === 200 && mechProfileRes.data?.email === mechEmail && !mechProfileRes.data?.password);

        // 3.2 PUT /api/update/mechanic/profile
        const mechUpdateRes = await request(BASE_URL, 'PUT', '/api/update/mechanic/profile', {
            shopName: 'Super Metro Garage',
            services: ['Engine Repair', 'Highway Towing']
        }, mechToken);
        assert('PUT /api/update/mechanic/profile returns 200 with updated mechanic info',
            mechUpdateRes.status === 200 && mechUpdateRes.data?.mechanic?.shopName === 'Super Metro Garage');

        // 3.3 PATCH /api/mechanic/availability
        const availRes = await request(BASE_URL, 'PATCH', '/api/mechanic/availability', {
            isAvailable: true
        }, mechToken);
        assert('PATCH /api/mechanic/availability returns 200 with updated availability',
            availRes.status === 200 && availRes.data?.mechanic?.isAvailable === true);

        // 3.4 GET /api/nearby
        const nearbyRes = await request(BASE_URL, 'GET', '/api/nearby?lat=28.6139&lng=77.2090&radius=15', null, driverToken);
        assert('GET /api/nearby returns 200 with list of online mechanics and count',
            nearbyRes.status === 200 && nearbyRes.data?.success === true && Array.isArray(nearbyRes.data?.data) && nearbyRes.data?.count >= 1);

        // ====================================================
        // 4. Request Controller Lifecycle Endpoints
        // ====================================================
        console.log('\n--- 4. Request Endpoints via Controller ---');

        // Register second mechanic for unauthorized attempt testing
        const mech2Email = `${testTag}_mech2@trucksathi.test`;
        const mech2Reg = await request(BASE_URL, 'POST', '/api/auth/mechanic/register', {
            name: 'Controller Mech Two',
            email: mech2Email,
            phone: `7${String(timestamp).slice(-9)}`,
            password: 'MechTwoPassword@123',
            shopName: 'Second Garage',
            services: ['Brake Servicing'],
            location: { lat: 28.5000, lng: 77.1000 }
        });
        const mech2TokenRes = await request(BASE_URL, 'POST', '/api/auth/mechanic/login', {
            email: mech2Email,
            password: 'MechTwoPassword@123'
        });
        const mech2Token = mech2TokenRes.data?.token;
        if (mech2Reg.data?.data?._id) createdMechanicIds.push(mech2Reg.data.data._id);

        // 4.1 POST /api/requests (create request)
        const createReqRes = await request(BASE_URL, 'POST', '/api/requests', {
            mechanicId: mechRegRes.data.data._id,
            issue: 'Engine overheating on NH48',
            vehicleInfo: 'Ashok Leyland 2820',
            location: { latitude: 28.6140, longitude: 77.2091, address: 'Highway 48' }
        }, driverToken);
        const requestId = createReqRes.data?.data?._id;
        assert('POST /api/requests returns 201 with populated request data and pending status',
            createReqRes.status === 201 && requestId && createReqRes.data?.data?.status === 'pending');
        if (requestId) createdRequestIds.push(requestId);

        // 4.2 GET /api/requests/driver
        const driverReqsRes = await request(BASE_URL, 'GET', '/api/requests/driver', null, driverToken);
        assert('GET /api/requests/driver returns 200 with list of driver requests',
            driverReqsRes.status === 200 && Array.isArray(driverReqsRes.data?.data) && driverReqsRes.data?.count >= 1);

        // 4.3 GET /api/requests/mechanic
        const mechReqsRes = await request(BASE_URL, 'GET', '/api/requests/mechanic', null, mechToken);
        assert('GET /api/requests/mechanic returns 200 with list of incoming mechanic requests',
            mechReqsRes.status === 200 && Array.isArray(mechReqsRes.data?.data) && mechReqsRes.data?.count >= 1);

        // 4.4 GET /api/requests/:requestId (authorized driver and mechanic)
        const getReqDriverRes = await request(BASE_URL, 'GET', `/api/requests/${requestId}`, null, driverToken);
        assert('GET /api/requests/:requestId returns 200 for requesting driver',
            getReqDriverRes.status === 200 && getReqDriverRes.data?.data?._id === requestId);

        const getReqMechRes = await request(BASE_URL, 'GET', `/api/requests/${requestId}`, null, mechToken);
        assert('GET /api/requests/:requestId returns 200 for assigned mechanic',
            getReqMechRes.status === 200 && getReqMechRes.data?.data?._id === requestId);

        // 4.5 Unauthorized mechanic cannot view request (403)
        const unauthorizedViewRes = await request(BASE_URL, 'GET', `/api/requests/${requestId}`, null, mech2Token);
        assert('GET /api/requests/:requestId returns 403 for unauthorized mechanic',
            unauthorizedViewRes.status === 403);

        // 4.6 Unauthorized mechanic cannot accept request (403)
        const unauthorizedAcceptRes = await request(BASE_URL, 'PATCH', `/api/requests/${requestId}/accept`, {}, mech2Token);
        assert('PATCH /api/requests/:requestId/accept returns 403 for unauthorized mechanic',
            unauthorizedAcceptRes.status === 403);

        // 4.7 PATCH /api/requests/:requestId/accept (pending -> accepted)
        const acceptRes = await request(BASE_URL, 'PATCH', `/api/requests/${requestId}/accept`, {}, mechToken);
        assert('PATCH /api/requests/:requestId/accept returns 200 with accepted status and acceptedAt',
            acceptRes.status === 200 && acceptRes.data?.data?.status === 'accepted' && acceptRes.data?.data?.acceptedAt);

        // 4.8 Duplicate accept returns 409
        const duplicateAcceptRes = await request(BASE_URL, 'PATCH', `/api/requests/${requestId}/accept`, {}, mechToken);
        assert('Repeated PATCH /api/requests/:requestId/accept returns 409 (Already accepted)',
            duplicateAcceptRes.status === 409);

        // 4.9 Direct completion of accepted request without starting returns 400
        const directCompleteRes = await request(BASE_URL, 'PATCH', `/api/requests/${requestId}/complete`, {}, mechToken);
        assert('PATCH /api/requests/:requestId/complete from accepted status returns 400 error',
            directCompleteRes.status === 400);

        // 4.10 PATCH /api/requests/:requestId/start (accepted -> in_progress)
        const startRes = await request(BASE_URL, 'PATCH', `/api/requests/${requestId}/start`, {}, mechToken);
        assert('PATCH /api/requests/:requestId/start returns 200 with in_progress status and startedAt',
            startRes.status === 200 && startRes.data?.data?.status === 'in_progress' && startRes.data?.data?.startedAt);

        // 4.11 PATCH /api/requests/:requestId/complete (in_progress -> completed)
        const completeRes = await request(BASE_URL, 'PATCH', `/api/requests/${requestId}/complete`, {}, mechToken);
        assert('PATCH /api/requests/:requestId/complete returns 200 with completed status and completedAt',
            completeRes.status === 200 && completeRes.data?.data?.status === 'completed' && completeRes.data?.data?.completedAt);

        // 4.12 Cannot cancel completed request (400)
        const cancelCompletedRes = await request(BASE_URL, 'PATCH', `/api/requests/${requestId}/cancel`, {}, driverToken);
        assert('PATCH /api/requests/:requestId/cancel on completed request returns 400',
            cancelCompletedRes.status === 400);

        // 4.13 Test cancellation on separate pending request
        const reqToCancel = await request(BASE_URL, 'POST', '/api/requests', {
            mechanicId: mechRegRes.data.data._id,
            issue: 'Testing cancellation flow'
        }, driverToken);
        if (reqToCancel.data?.data?._id) {
            createdRequestIds.push(reqToCancel.data.data._id);
            const cancelRes = await request(BASE_URL, 'PATCH', `/api/requests/${reqToCancel.data.data._id}/cancel`, {}, driverToken);
            assert('PATCH /api/requests/:requestId/cancel transitions pending to cancelled with cancelledAt',
                cancelRes.status === 200 && cancelRes.data?.data?.status === 'cancelled' && cancelRes.data?.data?.cancelledAt);
        }

        // ====================================================
        // 5. Analytics Controller Endpoints
        // ====================================================
        console.log('\n--- 5. Analytics Endpoints via Controller ---');

        const visitorIdA = `visitor_ctrl_${timestamp}_A`;
        const visitorIdB = `visitor_ctrl_${timestamp}_B`;
        testVisitorIds.push(visitorIdA, visitorIdB);

        // 5.1 POST /api/analytics/visit (first visit -> 201)
        const visit1Res = await request(BASE_URL, 'POST', '/api/analytics/visit', {
            visitorId: visitorIdA,
            path: '/find-mechanic'
        });
        assert('POST /api/analytics/visit returns 201 for fresh visitor (recorded: true)',
            visit1Res.status === 201 && visit1Res.data?.recorded === true && visit1Res.data?.success === true);

        // 5.2 POST /api/analytics/visit within 15-minute cooldown -> 200 (recorded: false)
        const visit2Res = await request(BASE_URL, 'POST', '/api/analytics/visit', {
            visitorId: visitorIdA,
            path: '/find-mechanic'
        });
        assert('POST /api/analytics/visit returns 200 with recorded: false during 15-min cooldown window',
            visit2Res.status === 200 && visit2Res.data?.recorded === false && visit2Res.data?.success === true);

        // 5.3 POST /api/analytics/visit with distinct visitor -> 201
        const visit3Res = await request(BASE_URL, 'POST', '/api/analytics/visit', {
            visitorId: visitorIdB,
            path: '/about'
        });
        assert('POST /api/analytics/visit returns 201 for different visitor ID',
            visit3Res.status === 201 && visit3Res.data?.recorded === true);

        // ====================================================
        // 6. Admin Controller Endpoints
        // ====================================================
        console.log('\n--- 6. Admin Endpoints via Controller ---');

        // 6.1 GET /api/admin/dashboard
        const dashboardRes = await request(BASE_URL, 'GET', '/api/admin/dashboard', null, adminToken);
        assert('GET /api/admin/dashboard returns 200 with users, requests, and visits data',
            dashboardRes.status === 200 && dashboardRes.data?.data?.users && dashboardRes.data?.data?.requests && dashboardRes.data?.data?.visits);

        // 6.2 GET /api/admin/users
        const usersRes = await request(BASE_URL, 'GET', '/api/admin/users?search=Controller', null, adminToken);
        assert('GET /api/admin/users returns 200 with search-filtered users list',
            usersRes.status === 200 && Array.isArray(usersRes.data?.data) && usersRes.data?.count >= 1);

        // 6.3 GET /api/admin/drivers
        const driversRes = await request(BASE_URL, 'GET', '/api/admin/drivers', null, adminToken);
        assert('GET /api/admin/drivers returns 200 with driver list and request counts',
            driversRes.status === 200 && Array.isArray(driversRes.data?.data) && typeof driversRes.data?.data[0]?.requestCount === 'number');

        // 6.4 GET /api/admin/mechanics
        const mechsRes = await request(BASE_URL, 'GET', '/api/admin/mechanics', null, adminToken);
        assert('GET /api/admin/mechanics returns 200 with mechanics list and request counts',
            mechsRes.status === 200 && Array.isArray(mechsRes.data?.data) && typeof mechsRes.data?.data[0]?.requestCount === 'number');

        // 6.5 GET /api/admin/requests
        const reqsRes = await request(BASE_URL, 'GET', '/api/admin/requests?status=completed', null, adminToken);
        assert('GET /api/admin/requests returns 200 with status-filtered requests',
            reqsRes.status === 200 && Array.isArray(reqsRes.data?.data));

        // 6.6 GET /api/admin/analytics
        const analyticsRes = await request(BASE_URL, 'GET', '/api/admin/analytics', null, adminToken);
        assert('GET /api/admin/analytics returns 200 with traffic summary and 7-day trend',
            analyticsRes.status === 200 && analyticsRes.data?.data?.summary && Array.isArray(analyticsRes.data?.data?.dailyTrend));

    } catch (testError) {
        console.error('\n[FATAL ERROR IN TEST SUITE]:', testError);
        failedCount++;
    } finally {
        // Clean up fixtures
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
    console.log(`HTTP TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

    if (failedCount > 0) {
        process.exit(1);
    }
}

runControllerTestSuite();
