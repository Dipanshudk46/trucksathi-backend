require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const env = require('../src/config/env.config');
const connectDB = require('../src/config/db.config');
const driverRoutes = require('../src/routes/driver.Routes');
const authRouter = require('../src/routes/auth.Routes');
const mechanicRoutes = require('../src/routes/mechanic.Routes');
const requestRoutes = require('../src/routes/request.Routes');
const adminRoutes = require('../src/routes/admin.Routes');
const analyticsRoutes = require('../src/routes/analytics.Routes');
const errorHandler = require('../src/middleware/errorHandler.Middleware');
const AppError = require('../src/utils/AppError.Utils');
const { ROLES, ERROR_CODES } = require('../src/config/constants.config');

const Driver = require('../src/models/driver.Model');
const Mechanic = require('../src/models/mechanic.Model');
const ServiceRequest = require('../src/models/serviceRequest.Model');

let passedCount = 0;
let failedCount = 0;

function assert(description, condition) {
    if (condition) {
        console.log(`  ✓ [PASS] ${description}`);
        passedCount++;
    } else {
        console.error(`  ✗ [FAIL] ${description}`);
        failedCount++;
    }
}

function request(baseUrl, method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed = null;
                const contentType = res.headers['content-type'] || '';
                try {
                    parsed = JSON.parse(body);
                } catch {
                    parsed = body;
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    contentType,
                    data: parsed
                });
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function run() {
    console.log('\nRunning Security Hardening Tests...\n');

    await connectDB();

    // Build Express instance mirroring hardened server.js
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
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

    // Test hook for controlled unexpected error
    app.get('/test/unexpected-secret-error', (req, res, next) => {
        throw new Error(`DB Failed with ${env.MONGO_URI} and JWT ${env.JWT_SECRET}`);
    });

    app.use((req, res, next) => {
        next(new AppError('Route not found', 404, ERROR_CODES.ROUTE_NOT_FOUND));
    });

    app.use(errorHandler);

    const testPort = 3018;
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(testPort, resolve));
    const BASE_URL = `http://localhost:${testPort}`;
    console.log(`Security test server running at ${BASE_URL}\n`);

    const timestamp = Date.now();
    const testTag = `sec_${timestamp}`;

    const createdDriverIds = [];
    const createdMechanicIds = [];
    const createdRequestIds = [];

    try {
        // ====================================================
        // 1. HTTP HEADERS & FINGERPRINTING
        // ====================================================
        console.log('--- 1. HTTP Headers & Fingerprinting ---');
        const rootRes = await request(BASE_URL, 'GET', '/');
        assert('X-Powered-By header is removed to prevent technology fingerprinting',
            !rootRes.headers['x-powered-by']);

        // ====================================================
        // 2. AUTHENTICATION & TOKEN SAFETY
        // ====================================================
        console.log('\n--- 2. Authentication & Token Safety ---');

        // 2.1 Missing Token
        const missingTokenRes = await request(BASE_URL, 'GET', '/api/driver/profile');
        assert('Missing token is rejected with 401 UNAUTHORIZED',
            missingTokenRes.status === 401 && missingTokenRes.data?.code === 'UNAUTHORIZED');

        // 2.2 Invalid Token
        const invalidTokenRes = await request(BASE_URL, 'GET', '/api/driver/profile', null, 'forged.token.here');
        assert('Forged/Invalid token is rejected with 403 FORBIDDEN',
            invalidTokenRes.status === 403 && invalidTokenRes.data?.code === 'FORBIDDEN');

        // 2.3 Expired Token
        const expiredToken = jwt.sign({ id: 'dummy', role: 'driver' }, env.JWT_SECRET || 'secret', { expiresIn: '-10s' });
        const expiredTokenRes = await request(BASE_URL, 'GET', '/api/driver/profile', null, expiredToken);
        assert('Expired token is safely rejected with 401 UNAUTHORIZED',
            expiredTokenRes.status === 401 && expiredTokenRes.data?.code === 'UNAUTHORIZED');

        // ====================================================
        // 3. ROLE-BASED ACCESS CONTROL (RBAC)
        // ====================================================
        console.log('\n--- 3. Role-Based Access Control (RBAC) ---');

        const driverEmail = `${testTag}_driver@trucksathi.test`;
        const driverPass = 'DriverPass@123';
        const regDriverRes = await request(BASE_URL, 'POST', '/api/auth/driver/register', {
            name: 'Sec Driver',
            email: driverEmail,
            phone: `9${String(timestamp).slice(-9)}`,
            password: driverPass
        });
        const driverId = regDriverRes.data?.driver?._id;
        if (driverId) createdDriverIds.push(driverId);

        const loginDriverRes = await request(BASE_URL, 'POST', '/api/auth/driver/login', {
            email: driverEmail,
            password: driverPass
        });
        const driverToken = loginDriverRes.data?.token;

        const mechEmail = `${testTag}_mech@trucksathi.test`;
        const mechPass = 'MechPass@123';
        const regMechRes = await request(BASE_URL, 'POST', '/api/auth/mechanic/register', {
            name: 'Sec Mechanic',
            email: mechEmail,
            phone: `8${String(timestamp).slice(-9)}`,
            password: mechPass,
            shopName: 'Sec Workshop',
            services: ['Engine Repair'],
            location: { lat: 28.6, lng: 77.2 }
        });
        const mechId = regMechRes.data?.data?._id;
        if (mechId) createdMechanicIds.push(mechId);

        const loginMechRes = await request(BASE_URL, 'POST', '/api/auth/mechanic/login', {
            email: mechEmail,
            password: mechPass
        });
        const mechToken = loginMechRes.data?.token;

        // Driver accessing admin
        const driverAdminRes = await request(BASE_URL, 'GET', '/api/admin/dashboard', null, driverToken);
        assert('Driver cannot access admin endpoint (403 FORBIDDEN)',
            driverAdminRes.status === 403 && driverAdminRes.data?.code === 'FORBIDDEN');

        // Mechanic accessing admin
        const mechAdminRes = await request(BASE_URL, 'GET', '/api/admin/dashboard', null, mechToken);
        assert('Mechanic cannot access admin endpoint (403 FORBIDDEN)',
            mechAdminRes.status === 403 && mechAdminRes.data?.code === 'FORBIDDEN');

        // Mechanic accessing driver-only endpoint
        const mechDriverRes = await request(BASE_URL, 'GET', '/api/driver/profile', null, mechToken);
        assert('Mechanic cannot access driver profile (403 FORBIDDEN)',
            mechDriverRes.status === 403 && mechDriverRes.data?.code === 'FORBIDDEN');

        // Driver accessing mechanic-only endpoint
        const driverMechRes = await request(BASE_URL, 'PATCH', '/api/mechanic/availability', { isAvailable: false }, driverToken);
        assert('Driver cannot modify mechanic availability (403 FORBIDDEN)',
            driverMechRes.status === 403 && driverMechRes.data?.code === 'FORBIDDEN');

        // ====================================================
        // 4. PASSWORD & CREDENTIAL EXPOSURE AUDIT
        // ====================================================
        console.log('\n--- 4. Password & Credential Exposure Audit ---');

        assert('Password is not exposed in driver registration response',
            !regDriverRes.data?.driver?.password && !regDriverRes.data?.driver?.passwordHash);
        assert('Password is not exposed in mechanic registration response',
            !regMechRes.data?.data?.password && !regMechRes.data?.data?.passwordHash);
        assert('Password is not exposed in driver login response',
            !loginDriverRes.data?.user?.password && !loginDriverRes.data?.password);
        assert('Password is not exposed in mechanic login response',
            !loginMechRes.data?.user?.password && !loginMechRes.data?.password);

        const driverProfileRes = await request(BASE_URL, 'GET', '/api/driver/profile', null, driverToken);
        assert('Password is not exposed in driver profile response',
            !driverProfileRes.data?.password && !driverProfileRes.data?.passwordHash);

        const mechProfileRes = await request(BASE_URL, 'GET', '/api/mechanic/profile', null, mechToken);
        assert('Password is not exposed in mechanic profile response',
            !mechProfileRes.data?.password && !mechProfileRes.data?.passwordHash);

        // ====================================================
        // 5. PRIVILEGE ESCALATION & FIELD INJECTION PROTECTION
        // ====================================================
        console.log('\n--- 5. Privilege Escalation & Field Injection Protection ---');

        // Attempt privilege escalation: Driver sets role to admin
        const escalateRes = await request(BASE_URL, 'PUT', '/api/update/driver/profile', {
            name: 'Hacked Driver',
            role: 'admin'
        }, driverToken);

        const driverInDb = await Driver.findById(driverId);
        assert('Driver role escalation attempt blocked (role remains driver)',
            driverInDb.role === 'driver');
        assert('Privilege escalation rejected or ignored by schema/service',
            escalateRes.status === 400 || (escalateRes.status === 200 && driverInDb.role === 'driver'));

        // Attempt ownership forgery on request creation: Driver passes a forged driverId in body
        const forgedDriverId = new mongoose.Types.ObjectId().toString();
        const forgeAttemptRes = await request(BASE_URL, 'POST', '/api/requests', {
            driverId: forgedDriverId, // Forged driverId in body
            mechanicId: mechId,
            issue: 'Security test issue',
            vehicleInfo: 'Truck 101'
        }, driverToken);
        assert('Driver cannot inject driverId in request body (rejected by schema with 400)',
            forgeAttemptRes.status === 400 && forgeAttemptRes.data?.code === 'VALIDATION_ERROR');

        // Valid request creation assigns driverId strictly from authenticated user token
        const createReqRes = await request(BASE_URL, 'POST', '/api/requests', {
            mechanicId: mechId,
            issue: 'Security test issue',
            vehicleInfo: 'Truck 101'
        }, driverToken);
        const reqId = createReqRes.data?.data?._id;
        if (reqId) createdRequestIds.push(reqId);

        const requestInDb = await ServiceRequest.findById(reqId);
        assert('Request driverId in database is strictly bound to authenticated token identity',
            requestInDb.driverId.toString() === driverId.toString());

        // ====================================================
        // 6. RESOURCE OWNERSHIP ENFORCEMENT
        // ====================================================
        console.log('\n--- 6. Resource Ownership Enforcement ---');

        // Create a 2nd mechanic who is not assigned to this request
        const mech2Email = `${testTag}_mech2@trucksathi.test`;
        const regMech2Res = await request(BASE_URL, 'POST', '/api/auth/mechanic/register', {
            name: 'Unassigned Mech',
            email: mech2Email,
            phone: `7${String(timestamp).slice(-9)}`,
            password: 'MechPass@123',
            shopName: 'Unassigned Workshop',
            services: ['Engine Repair'],
            location: { lat: 28.5, lng: 77.1 }
        });
        if (regMech2Res.data?.data?._id) createdMechanicIds.push(regMech2Res.data.data._id);
        const loginMech2Res = await request(BASE_URL, 'POST', '/api/auth/mechanic/login', {
            email: mech2Email,
            password: 'MechPass@123'
        });
        const mech2Token = loginMech2Res.data?.token;

        // Unassigned mechanic attempts to view / accept Request
        const unassignedView = await request(BASE_URL, 'GET', `/api/requests/${reqId}`, null, mech2Token);
        assert('Unassigned mechanic forbidden from viewing request (403)',
            unassignedView.status === 403 && unassignedView.data?.code === 'FORBIDDEN');

        const unassignedAccept = await request(BASE_URL, 'PATCH', `/api/requests/${reqId}/accept`, {}, mech2Token);
        assert('Unassigned mechanic forbidden from accepting request (403)',
            unassignedAccept.status === 403 && unassignedAccept.data?.code === 'FORBIDDEN');

        // ====================================================
        // 7. INPUT VALIDATION & INJECTION RESISTANCE
        // ====================================================
        console.log('\n--- 7. Input Validation & Injection Resistance ---');

        // 7.1 Malformed ObjectId
        const malformedIdRes = await request(BASE_URL, 'GET', '/api/requests/not-a-valid-hex-id-1234', null, driverToken);
        assert('Malformed ObjectId URL parameter rejected before database query (400 VALIDATION_ERROR)',
            malformedIdRes.status === 400 && malformedIdRes.data?.code === 'VALIDATION_ERROR');

        // 7.2 Out of bounds coordinates
        const outOfBoundsCoordRes = await request(BASE_URL, 'GET', '/api/nearby?lat=999&lng=999', null, driverToken);
        assert('Out of bounds coordinates rejected with 400 VALIDATION_ERROR',
            outOfBoundsCoordRes.status === 400 && outOfBoundsCoordRes.data?.code === 'VALIDATION_ERROR');

        // 7.3 ReDoS Attack Safety on Admin Search Query
        // (Create admin token to test search)
        const adminEmail = env.ADMIN_EMAIL || 'admin@trucksathi.com';
        const adminLoginRes = await request(BASE_URL, 'POST', '/api/admin/login', {
            email: adminEmail,
            password: 'Admin@123'
        });
        const adminToken = adminLoginRes.data?.token;

        const redosSearchRes = await request(BASE_URL, 'GET', '/api/admin/users?search=(a+)+$', null, adminToken);
        assert('ReDoS regex payload in search parameter safely handled without hanging/crashing',
            redosSearchRes.status === 200 && Array.isArray(redosSearchRes.data?.data));

        // ====================================================
        // 8. UNEXPECTED ERROR SHIELD & SENSITIVE DATA LEAKAGE
        // ====================================================
        console.log('\n--- 8. Unexpected Error Shield & Sensitive Data Leakage ---');

        const secretErrorRes = await request(BASE_URL, 'GET', '/test/unexpected-secret-error');
        assert('Unhandled error returns safe 500 status', secretErrorRes.status === 500);
        assert('Unhandled error response code is INTERNAL_SERVER_ERROR',
            secretErrorRes.data?.code === 'INTERNAL_SERVER_ERROR');
        assert('Unhandled error message is generic: "Internal Server Error"',
            secretErrorRes.data?.message === 'Internal Server Error');

        const rawResponseBody = JSON.stringify(secretErrorRes.data);
        assert('JWT_SECRET is not leaked in error response',
            !rawResponseBody.includes(env.JWT_SECRET) || env.JWT_SECRET.length === 0);
        assert('MONGO_URI is not leaked in error response',
            !rawResponseBody.includes('mongodb'));
        assert('Stack trace is stripped and not exposed to client',
            !secretErrorRes.data?.stack);

        // ====================================================
        // 9. UNKNOWN ROUTE STANDARDIZED JSON (404)
        // ====================================================
        console.log('\n--- 9. Unknown Route Standardized JSON (404) ---');

        const notFoundRes = await request(BASE_URL, 'GET', '/api/unknown-endpoint');
        assert('Unknown route returns 404', notFoundRes.status === 404);
        assert('Unknown route returns application/json (never HTML)',
            notFoundRes.contentType.includes('application/json'));
        assert('Unknown route code is ROUTE_NOT_FOUND',
            notFoundRes.data?.code === 'ROUTE_NOT_FOUND');

    } finally {
        // Cleanup test fixtures
        console.log('\n--- Cleaning Up Test Fixtures ---');
        if (createdDriverIds.length > 0) {
            await Driver.deleteMany({ _id: { $in: createdDriverIds } });
        }
        if (createdMechanicIds.length > 0) {
            await Mechanic.deleteMany({ _id: { $in: createdMechanicIds } });
        }
        if (createdRequestIds.length > 0) {
            await ServiceRequest.deleteMany({ _id: { $in: createdRequestIds } });
        }
        console.log('Cleanup completed successfully.');
        await new Promise((resolve) => server.close(resolve));
    }

    console.log('\n======================================================');
    console.log(`SECURITY TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

    if (failedCount > 0) {
        process.exit(1);
    }
    process.exit(0);
}

run().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
