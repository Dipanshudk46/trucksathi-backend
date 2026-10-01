require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('../src/config/db.config');
const driverRoutes = require('../src/routes/driver.Routes');
const authRouter = require('../src/routes/auth.Routes');
const mechanicRoutes = require('../src/routes/mechanic.Routes');
const requestRoutes = require('../src/routes/request.Routes');
const adminRoutes = require('../src/routes/admin.Routes');
const analyticsRoutes = require('../src/routes/analytics.Routes');
const errorHandler = require('../src/middleware/errorHandler.Middleware');
const AppError = require('../src/utils/AppError.Utils');
const JwtHelper = require('../src/utils/jwtHelper.Utils');
const { ROLES, ERROR_CODES } = require('../src/config/constants.config');
const Driver = require('../src/models/driver.Model');
const Mechanic = require('../src/models/mechanic.Model');
const Admin = require('../src/models/admin.Model');
const jwt = require('jsonwebtoken');

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
    console.log('\nRunning Error Handling Tests...\n');

    await connectDB();

    // Build Express test application instance mirroring server.js
    const app = express();
    app.use(express.json());
    app.use(cors());

    // Mount standard application routes
    app.use('/api', driverRoutes);
    app.use('/api/auth', authRouter);
    app.use('/api', mechanicRoutes);
    app.use('/api', requestRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/analytics', analyticsRoutes);

    app.get('/', (req, res) => {
        res.send('Server is running');
    });

    // Controlled test hooks for database & internal errors
    app.get('/test/unexpected-error', (req, res, next) => {
        throw new Error('Database connection dropped unexpectedly in secret_module.js');
    });

    app.get('/test/mongoose-cast-error', (req, res, next) => {
        const castErr = new Error('Cast to ObjectId failed for value "bad-id-123" at path "mechanicId"');
        castErr.name = 'CastError';
        castErr.path = 'mechanicId';
        castErr.value = 'bad-id-123';
        next(castErr);
    });

    app.get('/test/mongoose-validation-error', (req, res, next) => {
        const valErr = new Error('Validation failed');
        valErr.name = 'ValidationError';
        valErr.errors = {
            phone: { path: 'phone', message: 'Path `phone` is required.' },
            email: { path: 'email', message: 'Path `email` is invalid.' }
        };
        next(valErr);
    });

    app.get('/test/mongo-duplicate-error', (req, res, next) => {
        const dupErr = new Error('E11000 duplicate key error collection: test.drivers index: email_1 dup key');
        dupErr.code = 11000;
        dupErr.keyValue = { email: 'duplicate@trucksathi.test' };
        next(dupErr);
    });

    app.get('/test/supported-services-error', (req, res, next) => {
        const err = new AppError('At least one valid supported service must be selected', 400, 'INVALID_SERVICES');
        err.supportedServices = ['Engine Repair', 'Highway Towing'];
        next(err);
    });

    // 404 Handler for undefined API routes
    app.use((req, res, next) => {
        next(new AppError('Route not found', 404, ERROR_CODES.ROUTE_NOT_FOUND));
    });

    // Centralized Application Error Handling Middleware
    app.use(errorHandler);

    const testPort = 3012;
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(testPort, resolve));
    const BASE_URL = `http://localhost:${testPort}`;
    console.log(`Error test server running at ${BASE_URL}\n`);

    const timestamp = Date.now();
    const testTag = `err_${timestamp}`;

    const createdDriverIds = [];
    const createdMechanicIds = [];

    try {
        // ====================================================
        // 1. 404 NOT FOUND HANDLING
        // ====================================================
        console.log('\n--- 1. 404 Not Found Handling ---');

        const notFoundRes = await request(BASE_URL, 'GET', '/api/does-not-exist');
        assert('GET /api/does-not-exist returns 404 status', notFoundRes.status === 404);
        assert('404 response is application/json (never HTML)', notFoundRes.contentType.includes('application/json'));
        assert('404 response has success: false', notFoundRes.data?.success === false);
        assert('404 response has code: ROUTE_NOT_FOUND', notFoundRes.data?.code === 'ROUTE_NOT_FOUND');
        assert('404 response has clear message: Route not found', notFoundRes.data?.message === 'Route not found');

        const notFoundPost = await request(BASE_URL, 'POST', '/random/unregistered/path', { foo: 'bar' });
        assert('POST /random/unregistered/path returns 404 JSON', notFoundPost.status === 404 && notFoundPost.data?.code === 'ROUTE_NOT_FOUND');

        // ====================================================
        // 2. VALIDATION ERROR HANDLING (Joi)
        // ====================================================
        console.log('\n--- 2. Validation Error Handling ---');

        const badRegRes = await request(BASE_URL, 'POST', '/api/auth/driver/register', {
            name: '',
            email: 'not-an-email',
            phone: '123'
        });
        assert('Joi validation failure returns 400', badRegRes.status === 400);
        assert('Validation error returns success: false', badRegRes.data?.success === false);
        assert('Validation error returns code: VALIDATION_ERROR', badRegRes.data?.code === 'VALIDATION_ERROR');
        assert('Validation error contains human-readable message', typeof badRegRes.data?.message === 'string' && badRegRes.data.message.length > 0);
        assert('Validation error contains structured details', Array.isArray(badRegRes.data?.details) && badRegRes.data.details.length > 0);
        assert('Validation error response is JSON', badRegRes.contentType.includes('application/json'));

        // ====================================================
        // 3. AUTHENTICATION & JWT ERROR HANDLING
        // ====================================================
        console.log('\n--- 3. Authentication & JWT Error Handling ---');

        const noTokenRes = await request(BASE_URL, 'GET', '/api/driver/profile');
        assert('Missing token returns 401', noTokenRes.status === 401);
        assert('Missing token error code is UNAUTHORIZED', noTokenRes.data?.code === 'UNAUTHORIZED');
        assert('Missing token message is "No token, access denied"', noTokenRes.data?.message === 'No token, access denied');
        assert('Missing token response is JSON', noTokenRes.contentType.includes('application/json'));

        const badTokenRes = await request(BASE_URL, 'GET', '/api/driver/profile', null, 'corrupted.jwt.signature');
        assert('Invalid token returns 403', badTokenRes.status === 403);
        assert('Invalid token error code is FORBIDDEN', badTokenRes.data?.code === 'FORBIDDEN');
        assert('Invalid token message is "Invalid token"', badTokenRes.data?.message === 'Invalid token');

        // Expired token test
        const secret = process.env.JWT_SECRET || 'secret';
        const expiredToken = jwt.sign({ id: 'dummy', role: 'driver' }, secret, { expiresIn: '-10s' });
        const expiredTokenRes = await request(BASE_URL, 'GET', '/api/driver/profile', null, expiredToken);
        assert('Expired token returns 401', expiredTokenRes.status === 401);
        assert('Expired token error code is UNAUTHORIZED', expiredTokenRes.data?.code === 'UNAUTHORIZED');
        assert('Expired token message is "Token expired"', expiredTokenRes.data?.message === 'Token expired');

        // ====================================================
        // 4. AUTHORIZATION ERROR HANDLING
        // ====================================================
        console.log('\n--- 4. Authorization Error Handling ---');

        // Register valid driver & mechanic to acquire authentic tokens
        const driverEmail = `${testTag}_dr@trucksathi.test`;
        const driverPhone = `9${String(timestamp).slice(-9)}`;
        const regDriver = await request(BASE_URL, 'POST', '/api/auth/driver/register', {
            name: 'Error Driver',
            email: driverEmail,
            phone: driverPhone,
            password: 'Password@123'
        });
        if (regDriver.data?.driver?._id) createdDriverIds.push(regDriver.data.driver._id);

        const loginDriver = await request(BASE_URL, 'POST', '/api/auth/driver/login', {
            email: driverEmail,
            password: 'Password@123'
        });
        const driverToken = loginDriver.data?.token;

        const mechEmail = `${testTag}_mc@trucksathi.test`;
        const mechPhone = `8${String(timestamp).slice(-9)}`;
        const regMech = await request(BASE_URL, 'POST', '/api/auth/mechanic/register', {
            name: 'Error Mech',
            email: mechEmail,
            phone: mechPhone,
            password: 'Password@123',
            shopName: 'Error Shop',
            services: ['Engine Repair'],
            location: { lat: 28.61, lng: 77.20 }
        });
        if (regMech.data?.data?._id) createdMechanicIds.push(regMech.data.data._id);

        const loginMech = await request(BASE_URL, 'POST', '/api/auth/mechanic/login', {
            email: mechEmail,
            password: 'Password@123'
        });
        const mechToken = loginMech.data?.token;

        // Driver attempts mechanic route
        const driverOnMech = await request(BASE_URL, 'PATCH', '/api/mechanic/availability', { isAvailable: false }, driverToken);
        assert('Driver accessing mechanic-only route returns 403', driverOnMech.status === 403);
        assert('Authorization failure returns code: FORBIDDEN', driverOnMech.data?.code === 'FORBIDDEN');
        assert('Authorization failure message is "Forbidden"', driverOnMech.data?.message === 'Forbidden');

        // Mechanic attempts driver route
        const mechOnDriver = await request(BASE_URL, 'GET', '/api/driver/profile', null, mechToken);
        assert('Mechanic accessing driver-only route returns 403', mechOnDriver.status === 403);
        assert('Role mismatch returns code: FORBIDDEN', mechOnDriver.data?.code === 'FORBIDDEN');

        // Driver attempts admin route
        const driverOnAdmin = await request(BASE_URL, 'GET', '/api/admin/dashboard', null, driverToken);
        assert('Driver accessing admin route returns 403', driverOnAdmin.status === 403);

        // ====================================================
        // 5. OPERATIONAL BUSINESS APPERROR HANDLING
        // ====================================================
        console.log('\n--- 5. Operational Business AppError Handling ---');

        // Bad login credentials
        const badLoginRes = await request(BASE_URL, 'POST', '/api/auth/driver/login', {
            email: driverEmail,
            password: 'WrongPassword@123'
        });
        assert('Invalid credentials returns 400', badLoginRes.status === 400);
        assert('Invalid credentials code is INVALID_CREDENTIALS', badLoginRes.data?.code === 'INVALID_CREDENTIALS');
        assert('Invalid credentials returns clear message: Invalid credentials', badLoginRes.data?.message === 'Invalid credentials');

        // Supported services error and metadata preservation
        const invalidServiceRes = await request(BASE_URL, 'GET', '/test/supported-services-error');
        assert('Invalid supported services returns 400', invalidServiceRes.status === 400);
        assert('Invalid supported services code is INVALID_SERVICES', invalidServiceRes.data?.code === 'INVALID_SERVICES');
        assert('Preserves supportedServices catalog in response for frontend', Array.isArray(invalidServiceRes.data?.supportedServices) && invalidServiceRes.data.supportedServices.length === 2);

        // Non-existent request retrieval AppError
        const notFoundRequestRes = await request(BASE_URL, 'GET', '/api/requests/507f1f77bcf86cd799439011', null, driverToken);
        assert('Non-existent request returns 404', notFoundRequestRes.status === 404);
        assert('Non-existent request code is REQUEST_NOT_FOUND', notFoundRequestRes.data?.code === 'REQUEST_NOT_FOUND');
        assert('Non-existent request message is "Service request not found"', notFoundRequestRes.data?.message === 'Service request not found');

        // Duplicate registration email
        const dupEmailRes = await request(BASE_URL, 'POST', '/api/auth/driver/register', {
            name: 'Another Driver',
            email: driverEmail, // duplicate
            phone: `7${String(timestamp).slice(-9)}`,
            password: 'Password@123'
        });
        assert('Duplicate driver email returns 400', dupEmailRes.status === 400);
        assert('Duplicate driver email code is EMAIL_EXISTS', dupEmailRes.data?.code === 'EMAIL_EXISTS');

        // ====================================================
        // 6. MONGOOSE & DATABASE ERROR MAPPING
        // ====================================================
        console.log('\n--- 6. Mongoose & Database Error Mapping ---');

        const castErrorRes = await request(BASE_URL, 'GET', '/test/mongoose-cast-error');
        assert('Mongoose CastError mapped to 400', castErrorRes.status === 400);
        assert('Mongoose CastError code is VALIDATION_ERROR', castErrorRes.data?.code === 'VALIDATION_ERROR');
        assert('Mongoose CastError message shields internal stack', castErrorRes.data?.message.includes('Invalid mechanicId: bad-id-123'));

        const valErrorRes = await request(BASE_URL, 'GET', '/test/mongoose-validation-error');
        assert('Mongoose ValidationError mapped to 400', valErrorRes.status === 400);
        assert('Mongoose ValidationError code is VALIDATION_ERROR', valErrorRes.data?.code === 'VALIDATION_ERROR');
        assert('Mongoose ValidationError preserves field error details', Array.isArray(valErrorRes.data?.details) && valErrorRes.data.details.length === 2);

        const dupKeyRes = await request(BASE_URL, 'GET', '/test/mongo-duplicate-error');
        assert('MongoDB 11000 duplicate key mapped to 409', dupKeyRes.status === 409);
        assert('MongoDB 11000 duplicate key code is CONFLICT', dupKeyRes.data?.code === 'CONFLICT');
        assert('MongoDB duplicate key message is client-safe', dupKeyRes.data?.message.includes('A record with that email already exists'));

        // ====================================================
        // 7. UNEXPECTED 500 ERROR HANDLING & SECURITY SHIELD
        // ====================================================
        console.log('\n--- 7. Unexpected 500 Error Handling & Security Shield ---');

        const unhandledRes = await request(BASE_URL, 'GET', '/test/unexpected-error');
        assert('Unhandled unexpected error returns 500', unhandledRes.status === 500);
        assert('Unhandled error returns code: INTERNAL_SERVER_ERROR', unhandledRes.data?.code === 'INTERNAL_SERVER_ERROR');
        assert('Unhandled error returns safe generic message: Internal Server Error', unhandledRes.data?.message === 'Internal Server Error');
        assert('Unhandled error does NOT leak internal exception message', !JSON.stringify(unhandledRes.data).includes('secret_module.js'));
        assert('Unhandled error does NOT leak stack trace in production-style mode', !unhandledRes.data?.stack);
        assert('Unhandled error does NOT leak database URI or credentials', !JSON.stringify(unhandledRes.data).includes('mongodb'));

        // Confirm Base Route still works
        const rootRes = await request(BASE_URL, 'GET', '/');
        assert('GET / returns 200 with "Server is running"', rootRes.status === 200 && rootRes.data === 'Server is running');

    } finally {
        // Cleanup test fixtures
        console.log('\n--- Cleaning Up Test Fixtures ---');
        if (createdDriverIds.length > 0) {
            await Driver.deleteMany({ _id: { $in: createdDriverIds } });
        }
        if (createdMechanicIds.length > 0) {
            await Mechanic.deleteMany({ _id: { $in: createdMechanicIds } });
        }
        console.log('Cleanup completed successfully.');
        await new Promise((resolve) => server.close(resolve));
    }

    console.log('\n======================================================');
    console.log(`ERROR TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
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
