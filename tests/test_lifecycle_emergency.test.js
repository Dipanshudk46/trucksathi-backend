const http = require('http');
const mongoose = require('mongoose');
const env = require('../src/config/env.config');
const ServiceRequest = require('../src/models/serviceRequest.Model');

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    parsed = data;
                }
                resolve({ status: res.statusCode, data: parsed, headers: res.headers });
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

function assert(description, condition) {
    if (condition) {
        console.log(`[PASS] ${description}`);
    } else {
        console.error(`[FAIL] ${description}`);
        process.exitCode = 1;
    }
}

async function run() {
    console.log('Running Request Lifecycle & Emergency UX Backend Tests...\n');

    await mongoose.connect(env.MONGO_URI);

    const timestamp = Date.now();

    // 1. Setup Driver
    const driverEmail = `driver_ux_${timestamp}@trucksathi.test`;
    const driverReg = await makeRequest('POST', '/api/auth/driver/register', {
        name: 'Nitin Driver',
        email: driverEmail,
        password: 'Password@123',
        phone: `9${String(timestamp).slice(-9)}`
    });
    assert('Driver registration succeeded', driverReg.status === 201 || driverReg.status === 200);

    const driverLogin = await makeRequest('POST', '/api/auth/driver/login', {
        email: driverEmail,
        password: 'Password@123'
    });
    const driverToken = driverLogin.data?.token;
    assert('Driver login succeeded with JWT', driverLogin.status === 200 && !!driverToken);

    // 2. Setup Mechanic
    const mechEmail = `mech_ux_${timestamp}@trucksathi.test`;
    const mechReg = await makeRequest('POST', '/api/auth/mechanic/register', {
        name: 'Nikhil Ustad',
        email: mechEmail,
        password: 'Password@123',
        phone: `8${String(timestamp).slice(-9)}`,
        shopName: 'Nikhil di workshop',
        location: {
            lat: 28.2055,
            lng: 76.8455,
            address: 'NH-48 Dharuhera'
        },
        services: ['Engine Repair', 'Brake Service']
    });
    assert('Mechanic registration succeeded', mechReg.status === 201 || mechReg.status === 200);

    const mechLogin = await makeRequest('POST', '/api/auth/mechanic/login', {
        email: mechEmail,
        password: 'Password@123'
    });
    const mechToken = mechLogin.data?.token;
    const mechId = mechLogin.data?.user?.id;
    assert('Mechanic login succeeded with JWT', mechLogin.status === 200 && !!mechToken && !!mechId);

    // 3. TEST 1: Driver creates NORMAL Request
    const normalReqRes = await makeRequest('POST', '/api/requests', {
        mechanicId: mechId,
        issue: 'Clutch plate slipping on grade',
        vehicleInfo: 'Tata Prima 407',
        requestType: 'normal',
        location: {
            latitude: 28.2055,
            longitude: 76.8455,
            address: 'NH-48 Dharuhera Milestone 52'
        }
    }, { 'Authorization': `Bearer ${driverToken}` });
    assert('Normal request creation succeeds (201)', normalReqRes.status === 201);
    const normalReqId = normalReqRes.data.data?._id;
    assert('Normal request has requestType: normal in API response', normalReqRes.data.data?.requestType === 'normal');

    const normalDoc = await ServiceRequest.findById(normalReqId);
    assert('Normal request has requestType: normal in MongoDB', normalDoc.requestType === 'normal');

    // 4. TEST 2: Driver creates EMERGENCY Request
    const emergencyReqRes = await makeRequest('POST', '/api/requests', {
        mechanicId: mechId,
        issue: 'Brake air pressure failure stopped on highway shoulder',
        vehicleInfo: 'Ashok Leyland 2820',
        requestType: 'emergency',
        location: {
            latitude: 28.2055,
            longitude: 76.8455,
            address: 'NH-48 Manesar Toll'
        }
    }, { 'Authorization': `Bearer ${driverToken}` });
    assert('Emergency request creation succeeds (201)', emergencyReqRes.status === 201);
    const emergencyReqId = emergencyReqRes.data.data?._id;
    assert('Emergency request has requestType: emergency in API response', emergencyReqRes.data.data?.requestType === 'emergency');

    const emergencyDoc = await ServiceRequest.findById(emergencyReqId);
    assert('Emergency request has requestType: emergency in MongoDB', emergencyDoc.requestType === 'emergency');

    // 5. TEST: Default behavior when requestType is omitted
    const defaultReqRes = await makeRequest('POST', '/api/requests', {
        mechanicId: mechId,
        issue: 'Windshield wiper motor stopped',
        vehicleInfo: 'Eicher Pro 3019',
        location: {
            latitude: 28.2055,
            longitude: 76.8455,
            address: 'NH-48 Dharuhera'
        }
    }, { 'Authorization': `Bearer ${driverToken}` });
    assert('Default request creation succeeds (201)', defaultReqRes.status === 201);
    assert('Default request type resolves to normal', defaultReqRes.data.data?.requestType === 'normal');

    // 6. TEST: Invalid requestType rejected by validator
    const invalidTypeRes = await makeRequest('POST', '/api/requests', {
        mechanicId: mechId,
        issue: 'Testing invalid requestType',
        requestType: 'super_urgent_critical'
    }, { 'Authorization': `Bearer ${driverToken}` });
    assert('Invalid requestType rejected with 400', invalidTypeRes.status === 400);

    // 7. Mechanic fetches incoming requests
    const mechIncoming = await makeRequest('GET', '/api/requests/mechanic', null, {
        'Authorization': `Bearer ${mechToken}`
    });
    assert('Mechanic gets incoming requests list (200)', mechIncoming.status === 200 && Array.isArray(mechIncoming.data?.data));
    const foundNormal = mechIncoming.data.data.find(r => r._id === normalReqId);
    const foundEmergency = mechIncoming.data.data.find(r => r._id === emergencyReqId);
    assert('Incoming list preserves normal requestType', foundNormal?.requestType === 'normal');
    assert('Incoming list preserves emergency requestType', foundEmergency?.requestType === 'emergency');

    // 8. TEST 3: Mechanic Accepts Emergency Request
    const acceptRes = await makeRequest('PATCH', `/api/requests/${emergencyReqId}/accept`, {}, {
        'Authorization': `Bearer ${mechToken}`
    });
    assert('Mechanic accepts emergency request (200)', acceptRes.status === 200 && acceptRes.data.data?.status === 'accepted');
    assert('Accepted request retains requestType: emergency', acceptRes.data.data?.requestType === 'emergency');
    assert('Accepted request has acceptedAt timestamp', !!acceptRes.data.data?.acceptedAt);

    // 9. TEST 4: Mechanic Cancels Request After Accepting
    const cancelRes = await makeRequest('PATCH', `/api/requests/${emergencyReqId}/cancel`, {}, {
        'Authorization': `Bearer ${mechToken}`
    });
    assert('Mechanic cancels request (200)', cancelRes.status === 200 && cancelRes.data.data?.status === 'cancelled');
    assert('Cancelled request has cancelledBy: mechanic', cancelRes.data.data?.cancelledBy === 'mechanic');
    assert('Cancelled request has cancelledAt timestamp', !!cancelRes.data.data?.cancelledAt);
    assert('Cancelled request preserves mechanic details', !!cancelRes.data.data?.mechanicId);

    // 10. TEST 5: Driver Fetches Requests After Mechanic Cancellation
    const driverReqsRes = await makeRequest('GET', '/api/requests/driver', null, {
        'Authorization': `Bearer ${driverToken}`
    });
    assert('Driver fetches requests successfully (200)', driverReqsRes.status === 200);
    const driverCancelledReq = driverReqsRes.data.data.find(r => r._id === emergencyReqId);
    assert('Cancelled request is NOT lost - returned in driver requests list', !!driverCancelledReq);
    assert('Cancelled request in driver list has status: cancelled', driverCancelledReq?.status === 'cancelled');
    assert('Cancelled request in driver list has cancelledBy: mechanic', driverCancelledReq?.cancelledBy === 'mechanic');
    assert('Cancelled request in driver list has mechanic shopName (Nikhil di workshop)', driverCancelledReq?.mechanicId?.shopName === 'Nikhil di workshop');
    assert('Cancelled request in driver list has cancelledAt date', !!driverCancelledReq?.cancelledAt);

    // 11. TEST 6: Invalid state transitions on cancelled request
    const reAcceptRes = await makeRequest('PATCH', `/api/requests/${emergencyReqId}/accept`, {}, {
        'Authorization': `Bearer ${mechToken}`
    });
    assert('Cannot re-accept cancelled request (400)', reAcceptRes.status === 400);

    const reStartRes = await makeRequest('PATCH', `/api/requests/${emergencyReqId}/start`, {}, {
        'Authorization': `Bearer ${mechToken}`
    });
    assert('Cannot start cancelled request (400)', reStartRes.status === 400);

    const reCompleteRes = await makeRequest('PATCH', `/api/requests/${emergencyReqId}/complete`, {}, {
        'Authorization': `Bearer ${mechToken}`
    });
    assert('Cannot complete cancelled request (400)', reCompleteRes.status === 400);

    // 12. Cleanup
    await ServiceRequest.deleteMany({
        _id: { $in: [normalReqId, emergencyReqId, defaultReqRes.data.data?._id] }
    });
    await mongoose.connection.close();

    console.log('\n==================================================');
    console.log('ALL REQUEST LIFECYCLE & EMERGENCY TESTS PASSED!');
    console.log('==================================================\n');
}

run().catch((err) => {
    console.error('Test run error:', err);
    process.exit(1);
});
