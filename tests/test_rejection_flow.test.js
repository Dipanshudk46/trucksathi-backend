/**
 * TruckSathi Rejection vs Cancellation Lifecycle Test Suite
 * Validates:
 * 1. Scenario A: Mechanic rejects before accepting -> status: 'rejected'
 * 2. Scenario B: Mechanic accepts then cancels -> status: 'cancelled', cancelledBy: 'mechanic'
 * 3. Scenario C: Mechanic accepts then completes -> status: 'completed'
 * 4. Scenario D: Driver cancels before mechanic accepts -> status: 'cancelled', cancelledBy: 'driver'
 * 5. Scenario E: Driver receives all terminal states via GET /api/requests/driver with preserved mechanic info
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');

const connectDB = require('../src/config/db.config');
const errorHandler = require('../src/middleware/errorHandler.Middleware');

const authRouter = require('../src/routes/auth.Routes');
const driverRoutes = require('../src/routes/driver.Routes');
const mechanicRoutes = require('../src/routes/mechanic.Routes');
const requestRoutes = require('../src/routes/request.Routes');

const Driver = require('../src/models/driver.Model');
const Mechanic = require('../src/models/mechanic.Model');
const ServiceRequest = require('../src/models/serviceRequest.Model');

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

async function runRejectionFlowTestSuite() {
    console.log('\nRunning Rejection vs Cancellation Flow Tests...\n');

    await connectDB();

    const app = express();
    app.use(cors());
    app.use(express.json());

    app.use('/api', driverRoutes);
    app.use('/api/auth', authRouter);
    app.use('/api', mechanicRoutes);
    app.use('/api', requestRoutes);
    app.use(errorHandler);

    const testServer = http.createServer(app);
    const PORT = 3012;
    await new Promise((resolve) => testServer.listen(PORT, resolve));
    const serverUrl = `http://localhost:${PORT}`;

    const testTimestamp = Date.now();
    const testDriverEmail = `reject_test_driver_${testTimestamp}@trucksathi.com`;
    const testDriverPhone = `98${String(testTimestamp).slice(-8)}`;

    const testMechEmail = `reject_test_mech_${testTimestamp}@trucksathi.com`;
    const testMechPhone = `97${String(testTimestamp).slice(-8)}`;

    let driverId = null;
    let mechId = null;

    try {
        // Register & login test driver
        const driverReg = await request(serverUrl, 'POST', '/api/auth/driver/register', {
            name: 'Test Rejection Driver',
            phone: testDriverPhone,
            email: testDriverEmail,
            password: 'Password@123'
        });
        assert('Driver registered', driverReg.status === 201, JSON.stringify(driverReg.data));
        driverId = driverReg.data?.driver?._id;

        const driverLogin = await request(serverUrl, 'POST', '/api/auth/driver/login', {
            email: testDriverEmail,
            password: 'Password@123'
        });
        const driverToken = driverLogin.data?.data?.token || driverLogin.data?.token;
        if (!driverId) driverId = driverLogin.data?.data?.user?.id || driverLogin.data?.user?.id;
        assert('Driver logged in with token', Boolean(driverToken));

        // Register & login test mechanic
        const mechReg = await request(serverUrl, 'POST', '/api/auth/mechanic/register', {
            name: 'Nikhil Mechanic',
            shopName: 'Nikhil di workshop',
            phone: testMechPhone,
            email: testMechEmail,
            password: 'Password@123',
            services: ['Engine', 'Tyre'],
            location: { lat: 28.6139, lng: 77.2090 }
        });
        assert('Mechanic registered', mechReg.status === 201, JSON.stringify(mechReg.data));
        mechId = mechReg.data?.data?._id || mechReg.data?.mechanic?._id;

        const mechLogin = await request(serverUrl, 'POST', '/api/auth/mechanic/login', {
            email: testMechEmail,
            password: 'Password@123'
        });
        const mechToken = mechLogin.data?.token || mechLogin.data?.data?.token;
        if (!mechId) mechId = mechLogin.data?.user?.id || mechLogin.data?.data?.user?.id;
        assert('Mechanic logged in with token', Boolean(mechToken));

        // ========================================================
        // SCENARIO A: MECHANIC REJECTS BEFORE ACCEPTING
        // ========================================================
        console.log('\n--- Scenario A: Mechanic Rejects Pending Request ---');
        const reqACreate = await request(serverUrl, 'POST', '/api/requests', {
            mechanicId: mechId,
            issue: 'Clutch failure on Highway NH-44',
            location: {
                latitude: 28.6140,
                longitude: 77.2095,
                address: 'Mile 42, NH-44'
            },
            vehicleInfo: 'Tata Prima 4028.S',
            requestType: 'normal'
        }, driverToken);

        assert('Driver creates Request A', reqACreate.status === 201 && reqACreate.data?.data?.status === 'pending');
        const reqAId = reqACreate.data.data._id;

        // Mechanic rejects
        const reqAReject = await request(serverUrl, 'PATCH', `/api/requests/${reqAId}/reject`, {}, mechToken);
        assert('Mechanic rejects Request A -> status 200', reqAReject.status === 200);
        assert('Request A status is rejected', reqAReject.data?.data?.status === 'rejected');

        // Driver views driver requests
        const driverReqsA = await request(serverUrl, 'GET', '/api/requests/driver', null, driverToken);
        assert('Driver fetches requests -> status 200', driverReqsA.status === 200);
        const fetchedReqA = driverReqsA.data?.data?.find(r => r._id === reqAId);
        assert('Request A returned in driver requests list', Boolean(fetchedReqA));
        assert('Request A status is rejected', fetchedReqA?.status === 'rejected');
        assert('Request A preserves mechanic shopName', fetchedReqA?.mechanicId?.shopName === 'Nikhil di workshop');
        assert('Request A is NOT labelled cancelled', fetchedReqA?.status !== 'cancelled');

        // ========================================================
        // SCENARIO B: MECHANIC ACCEPTS THEN CANCELS
        // ========================================================
        console.log('\n--- Scenario B: Mechanic Accepts then Cancels ---');
        const reqBCreate = await request(serverUrl, 'POST', '/api/requests', {
            mechanicId: mechId,
            issue: 'Radiator boil over',
            location: {
                latitude: 28.6140,
                longitude: 77.2095,
                address: 'Mile 45, NH-44'
            },
            vehicleInfo: 'Ashok Leyland 2820',
            requestType: 'emergency'
        }, driverToken);
        const reqBId = reqBCreate.data.data._id;

        // Mechanic accepts
        const reqBAccept = await request(serverUrl, 'PATCH', `/api/requests/${reqBId}/accept`, {}, mechToken);
        assert('Mechanic accepts Request B', reqBAccept.status === 200 && reqBAccept.data?.data?.status === 'accepted');

        // Mechanic cancels
        const reqBCancel = await request(serverUrl, 'PATCH', `/api/requests/${reqBId}/cancel`, {}, mechToken);
        assert('Mechanic cancels accepted Request B -> status 200', reqBCancel.status === 200);
        assert('Request B status is cancelled', reqBCancel.data?.data?.status === 'cancelled');
        assert('Request B cancelledBy is mechanic', reqBCancel.data?.data?.cancelledBy === 'mechanic');

        // Driver fetches requests
        const driverReqsB = await request(serverUrl, 'GET', '/api/requests/driver', null, driverToken);
        const fetchedReqB = driverReqsB.data?.data?.find(r => r._id === reqBId);
        assert('Request B returned to driver', Boolean(fetchedReqB));
        assert('Request B status is cancelled', fetchedReqB?.status === 'cancelled');
        assert('Request B cancelledBy is mechanic', fetchedReqB?.cancelledBy === 'mechanic');
        assert('Request B is NOT labelled rejected', fetchedReqB?.status !== 'rejected');

        // ========================================================
        // SCENARIO C: ACCEPT -> COMPLETE
        // ========================================================
        console.log('\n--- Scenario C: Mechanic Accepts then Completes ---');
        const reqCCreate = await request(serverUrl, 'POST', '/api/requests', {
            mechanicId: mechId,
            issue: 'Brake booster air leak',
            location: {
                latitude: 28.6140,
                longitude: 77.2095,
                address: 'Mile 50, NH-44'
            },
            vehicleInfo: 'BharatBenz 3528C',
            requestType: 'normal'
        }, driverToken);
        const reqCId = reqCCreate.data.data._id;

        await request(serverUrl, 'PATCH', `/api/requests/${reqCId}/accept`, {}, mechToken);
        await request(serverUrl, 'PATCH', `/api/requests/${reqCId}/start`, {}, mechToken);
        const reqCComplete = await request(serverUrl, 'PATCH', `/api/requests/${reqCId}/complete`, {}, mechToken);
        assert('Request C completed successfully', reqCComplete.status === 200 && reqCComplete.data?.data?.status === 'completed');

        // ========================================================
        // SCENARIO D: DRIVER CANCELS BEFORE ACCEPT
        // ========================================================
        console.log('\n--- Scenario D: Driver Cancels Pending Request ---');
        const reqDCreate = await request(serverUrl, 'POST', '/api/requests', {
            mechanicId: mechId,
            issue: 'Puncture repair',
            location: {
                latitude: 28.6140,
                longitude: 77.2095,
                address: 'Mile 52, NH-44'
            },
            vehicleInfo: 'Tata Signa',
            requestType: 'normal'
        }, driverToken);
        const reqDId = reqDCreate.data.data._id;

        const reqDCancel = await request(serverUrl, 'PATCH', `/api/requests/${reqDId}/cancel`, {}, driverToken);
        assert('Driver cancels pending Request D', reqDCancel.status === 200);
        assert('Request D status is cancelled', reqDCancel.data?.data?.status === 'cancelled');
        assert('Request D cancelledBy is driver', reqDCancel.data?.data?.cancelledBy === 'driver');

        // ========================================================
        // SCENARIO E: REFRESH / HISTORY VISIBILITY
        // ========================================================
        console.log('\n--- Scenario E: All Terminal States Maintained on Fetch/Refresh ---');
        const allDriverReqs = await request(serverUrl, 'GET', '/api/requests/driver', null, driverToken);
        const list = allDriverReqs.data?.data || [];
        assert('Driver receives all 4 requests', list.length >= 4);

        const hasRejected = list.some(r => r.status === 'rejected');
        const hasCancelledByMech = list.some(r => r.status === 'cancelled' && r.cancelledBy === 'mechanic');
        const hasCompleted = list.some(r => r.status === 'completed');
        const hasCancelledByDriver = list.some(r => r.status === 'cancelled' && r.cancelledBy === 'driver');

        assert('History preserves rejected request', hasRejected);
        assert('History preserves cancelled by mechanic request', hasCancelledByMech);
        assert('History preserves completed request', hasCompleted);
        assert('History preserves cancelled by driver request', hasCancelledByDriver);

    } finally {
        console.log('\n--- Cleaning Up Fixtures ---');
        if (driverId) {
            await ServiceRequest.deleteMany({ driverId });
            await Driver.findByIdAndDelete(driverId);
        }
        if (mechId) {
            await Mechanic.findByIdAndDelete(mechId);
        }
        await new Promise((resolve) => testServer.close(resolve));
        await mongoose.connection.close();
        console.log('Cleanup complete.');
    }

    console.log(`\n======================================================`);
    console.log(`REJECTION SUITE: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log(`======================================================\n`);

    if (failedCount > 0) {
        process.exit(1);
    }
}

runRejectionFlowTestSuite().catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
});
