const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ServiceRequest = require('../src/models/serviceRequest.Model');

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, pathName, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(pathName, BASE_URL);
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

async function runTests() {
    console.log('\nRunning End-to-End Verification Tests...\n');

    let passed = 0;
    let failed = 0;

    function assert(desc, condition, details = '') {
        if (condition) {
            console.log(`[PASS] ${desc}`);
            passed++;
        } else {
            console.error(`[FAIL] ${desc} - ${details}`);
            failed++;
        }
    }

    try {
        if (mongoose.connection.readyState === 0 && process.env.MONGO_URI) {
            await mongoose.connect(process.env.MONGO_URI);
        }

        // 1. API Health / Root
        const rootRes = await makeRequest('GET', '/');
        assert('API Root responds with 200', rootRes.status === 200);

        // 1b. Public Visitor Beacon Recording
        const beaconRes = await makeRequest('POST', '/api/analytics/visit', {
            visitorId: `vis_${Date.now()}`,
            path: '/landing',
            referrer: 'https://google.com'
        });
        assert('Visitor beacon recorded', (beaconRes.status === 200 || beaconRes.status === 201) && beaconRes.data?.success === true);

        // 2. Register Driver
        const timestamp = Date.now();
        const driverEmail = `testdriver_${timestamp}@trucksathi.test`;
        const driverPassword = 'Password@123';
        const driverPhone = `9${String(timestamp).slice(-9)}`;
        const driverReg = await makeRequest('POST', '/api/auth/driver/register', {
            name: 'Gurpreet Singh',
            email: driverEmail,
            password: driverPassword,
            phone: driverPhone
        });
        assert('Driver registration returns 201/success', driverReg.status === 201 || driverReg.status === 200);

        // 3. Driver Login
        const driverLogin = await makeRequest('POST', '/api/auth/driver/login', {
            email: driverEmail,
            password: driverPassword
        });
        assert('Driver login succeeds with JWT', driverLogin.status === 200 && !!driverLogin.data?.token);
        const driverToken = driverLogin.data?.token;

        // 4. Register Mechanic
        const mechEmail = `testmech_${timestamp}@trucksathi.test`;
        const mechPassword = 'Password@123';
        const mechPhone = `8${String(timestamp).slice(-9)}`;
        const mechReg = await makeRequest('POST', '/api/auth/mechanic/register', {
            name: 'Balwinder Ustad',
            email: mechEmail,
            password: mechPassword,
            phone: mechPhone,
            shopName: 'Balwinder Highway Workshop',
            location: {
                lat: 28.6139,
                lng: 77.2090,
                address: 'NH-48, Near Toll Plaza, Manesar'
            },
            services: ['Engine Repair', 'Tyre Service', 'Brake Service']
        });
        assert('Mechanic registration returns 201/success', mechReg.status === 201 || mechReg.status === 200);

        // 5. Mechanic Login
        const mechLogin = await makeRequest('POST', '/api/auth/mechanic/login', {
            email: mechEmail,
            password: mechPassword
        });
        assert('Mechanic login succeeds with JWT', mechLogin.status === 200 && !!mechLogin.data?.token);
        const mechToken = mechLogin.data?.token;

        // Fetch Mechanic Profile for ID
        const mechProfile = await makeRequest('GET', '/api/mechanic/profile', null, {
            'Authorization': `Bearer ${mechToken}`
        });
        const mechId = mechProfile.data?.data?._id || mechProfile.data?._id;
        assert('Mechanic profile fetched with ID', !!mechId);

        // 6. Search Nearby Mechanics as Driver
        const searchNearby = await makeRequest('GET', `/api/nearby?lat=28.6140&lng=77.2095&radius=50`, null, {
            'Authorization': `Bearer ${driverToken}`
        });
        assert('Driver search nearby mechanics succeeds', searchNearby.status === 200 && Array.isArray(searchNearby.data?.data));

        // 7. Driver Creates Service Request 1
        const createReq1 = await makeRequest('POST', '/api/requests', {
            mechanicId: mechId,
            issue: 'Flat tire near highway NH-48 mile marker 42',
            vehicleInfo: 'Tata Prima 4028.S (HR 55 AB 1234)',
            location: {
                latitude: 28.6139,
                longitude: 77.2090,
                address: 'NH-48, Sector 14'
            }
        }, {
            'Authorization': `Bearer ${driverToken}`
        });
        const requestId1 = createReq1.data.data?._id;
        assert('Driver creates service request', (createReq1.status === 201 || createReq1.status === 200) && !!requestId1);

        // 7a. Cannot complete request when pending (400)
        const completePendingAttempt = await makeRequest('PATCH', `/api/requests/${requestId1}/complete`, {}, {
            'Authorization': `Bearer ${mechToken}`
        });
        assert('Cannot complete request when pending (400)', completePendingAttempt.status === 400);

        // 7b. Mechanic Accepts Service Request 1 (/api/requests/:id/accept)
        const acceptReq = await makeRequest('PATCH', `/api/requests/${requestId1}/accept`, {}, {
            'Authorization': `Bearer ${mechToken}`
        });
        assert('Mechanic accepts request', acceptReq.status === 200 && acceptReq.data.data?.status === 'accepted' && !!acceptReq.data.data?.acceptedAt);

        // 7c. Driver cannot start assistance (role forbidden: 403)
        const driverStartAttempt = await makeRequest('PATCH', `/api/requests/${requestId1}/start`, {}, {
            'Authorization': `Bearer ${driverToken}`
        });
        assert('Driver forbidden from starting assistance (403)', driverStartAttempt.status === 403);

        // 7d. Driver cannot complete assistance (role forbidden: 403)
        const driverCompleteAttempt = await makeRequest('PATCH', `/api/requests/${requestId1}/complete`, {}, {
            'Authorization': `Bearer ${driverToken}`
        });
        assert('Driver forbidden from completing assistance (403)', driverCompleteAttempt.status === 403);

        // 7e. Mechanic CANNOT complete request directly from accepted status (must first start: 400)
        const completeAcceptedAttempt = await makeRequest('PATCH', `/api/requests/${requestId1}/complete`, {}, {
            'Authorization': `Bearer ${mechToken}`
        });
        assert('Cannot complete request directly from accepted status (400)', completeAcceptedAttempt.status === 400);

        // 7f. Mechanic Starts Roadside Assistance (/api/requests/:id/start)
        const startReq = await makeRequest('PATCH', `/api/requests/${requestId1}/start`, {}, {
            'Authorization': `Bearer ${mechToken}`
        });
        assert('Mechanic starts assistance (in_progress)', startReq.status === 200 && startReq.data.data?.status === 'in_progress' && !!startReq.data.data?.startedAt);

        // 7g. Mechanic Marks Assistance Completed (/api/requests/:id/complete)
        const completeReq = await makeRequest('PATCH', `/api/requests/${requestId1}/complete`, {}, {
            'Authorization': `Bearer ${mechToken}`
        });
        assert('Mechanic completes assistance (completed)', completeReq.status === 200 && completeReq.data.data?.status === 'completed' && !!completeReq.data.data?.completedAt);

        // 7h. Invalid state transitions on completed request rejected (400)
        const reAcceptAttempt = await makeRequest('PATCH', `/api/requests/${requestId1}/accept`, {}, {
            'Authorization': `Bearer ${mechToken}`
        });
        assert('Cannot accept already completed request (400)', reAcceptAttempt.status === 400);

        const reStartAttempt = await makeRequest('PATCH', `/api/requests/${requestId1}/start`, {}, {
            'Authorization': `Bearer ${mechToken}`
        });
        assert('Cannot start already completed request (400)', reStartAttempt.status === 400);

        const reCompleteAttempt = await makeRequest('PATCH', `/api/requests/${requestId1}/complete`, {}, {
            'Authorization': `Bearer ${mechToken}`
        });
        assert('Cannot re-complete already completed request (400)', reCompleteAttempt.status === 400);

        // 8. Driver Creates Service Request 2 & Mechanic Cancels It While Pending
        const createReq2 = await makeRequest('POST', '/api/requests', {
            mechanicId: mechId,
            issue: 'Overheating engine cooling fan failure',
            vehicleInfo: 'Ashok Leyland 2820',
            location: {
                latitude: 28.6139,
                longitude: 77.2090,
                address: 'NH-48, Toll Gate'
            }
        }, {
            'Authorization': `Bearer ${driverToken}`
        });
        const requestId2 = createReq2.data.data?._id;
        const cancelReq = await makeRequest('PATCH', `/api/requests/${requestId2}/cancel`, {}, {
            'Authorization': `Bearer ${mechToken}`
        });
        assert('Mechanic cancels pending request', cancelReq.status === 200 && cancelReq.data.data?.status === 'cancelled' && cancelReq.data.data?.cancelledBy === 'mechanic');

        // 8a. Cannot complete cancelled request (400)
        const completeCancelledAttempt = await makeRequest('PATCH', `/api/requests/${requestId2}/complete`, {}, {
            'Authorization': `Bearer ${mechToken}`
        });
        assert('Cannot complete cancelled request (400)', completeCancelledAttempt.status === 400);

        // 8b. Test Expiration: Create Request 3 and backdate createdAt to 35m ago
        const createReq3 = await makeRequest('POST', '/api/requests', {
            mechanicId: mechId,
            issue: 'Radiator overheating boiling coolant',
            vehicleInfo: 'BharatBenz 3523',
            location: { latitude: 28.6139, longitude: 77.2090, address: 'NH-48, km 55' }
        }, { 'Authorization': `Bearer ${driverToken}` });
        const requestId3 = createReq3.data.data?._id;

        await ServiceRequest.collection.updateOne(
            { _id: new mongoose.Types.ObjectId(requestId3) },
            { $set: { createdAt: new Date(Date.now() - 35 * 60 * 1000) } }
        );

        // Driver fetches requests, triggering lazy expiration sweep
        const driverReqsAfterExpire = await makeRequest('GET', '/api/requests/driver', null, { 'Authorization': `Bearer ${driverToken}` });
        const expiredReq = driverReqsAfterExpire.data.data?.find(r => r._id?.toString() === requestId3?.toString());
        assert('Pending request older than 30 mins marked expired', expiredReq && expiredReq.status === 'expired' && !!expiredReq.expiredAt);

        // Attempting to accept expired request must be rejected (400)
        const acceptExpiredAttempt = await makeRequest('PATCH', `/api/requests/${requestId3}/accept`, {}, { 'Authorization': `Bearer ${mechToken}` });
        assert('Attempting to accept expired request rejected (400)', acceptExpiredAttempt.status === 400);

        // Attempting to complete expired request must be rejected (400)
        const completeExpiredAttempt = await makeRequest('PATCH', `/api/requests/${requestId3}/complete`, {}, { 'Authorization': `Bearer ${mechToken}` });
        assert('Attempting to complete expired request rejected (400)', completeExpiredAttempt.status === 400);

        // 8c. Accepted request older than 30 mins remains active (NOT expired automatically)
        const createReq4 = await makeRequest('POST', '/api/requests', {
            mechanicId: mechId,
            issue: 'Clutch plate replacement',
            vehicleInfo: 'Eicher Pro 6028',
            location: { latitude: 28.6139, longitude: 77.2090, address: 'NH-48, km 60' }
        }, { 'Authorization': `Bearer ${driverToken}` });
        const requestId4 = createReq4.data.data?._id;
        await makeRequest('PATCH', `/api/requests/${requestId4}/accept`, {}, { 'Authorization': `Bearer ${mechToken}` });

        // Backdate accepted request to 45 mins ago
        await ServiceRequest.collection.updateOne(
            { _id: new mongoose.Types.ObjectId(requestId4) },
            { $set: { createdAt: new Date(Date.now() - 45 * 60 * 1000) } }
        );
        const driverReqsAfterAccepted = await makeRequest('GET', '/api/requests/driver', null, { 'Authorization': `Bearer ${driverToken}` });
        const stillAcceptedReq = driverReqsAfterAccepted.data.data?.find(r => r._id?.toString() === requestId4?.toString());
        assert('Accepted request older than 30 mins remains active (NOT expired)', stillAcceptedReq && stillAcceptedReq.status === 'accepted');

        // 9. Driver Role Forbidden from Admin APIs
        const driverAdminAttempt = await makeRequest('GET', '/api/admin/dashboard', null, {
            'Authorization': `Bearer ${driverToken}`
        });
        assert('Driver forbidden from /api/admin/dashboard (403)', driverAdminAttempt.status === 403);

        // 10. Mechanic Role Forbidden from Admin APIs
        const mechAdminAttempt = await makeRequest('GET', '/api/admin/dashboard', null, {
            'Authorization': `Bearer ${mechToken}`
        });
        assert('Mechanic forbidden from /api/admin/dashboard (403)', mechAdminAttempt.status === 403);

        // 11. Unauthenticated Request to Admin APIs
        const anonAdminAttempt = await makeRequest('GET', '/api/admin/dashboard');
        assert('Unauthenticated request to /api/admin/dashboard rejected (401)', anonAdminAttempt.status === 401);

        // 12. Admin Login with Seeded Default Credentials
        const adminLogin = await makeRequest('POST', '/api/admin/login', {
            email: 'admin@trucksathi.com',
            password: 'Admin@123'
        });
        assert('Admin login with default seeded credentials succeeds (200)', adminLogin.status === 200 && !!adminLogin.data?.token);
        const adminToken = adminLogin.data?.token;

        // 13. Admin Dashboard Metrics
        const adminDashboard = await makeRequest('GET', '/api/admin/dashboard', null, {
            'Authorization': `Bearer ${adminToken}`
        });
        assert('Admin dashboard returns counts & metrics',
            adminDashboard.status === 200 &&
            typeof adminDashboard.data.data?.users?.total === 'number' &&
            typeof adminDashboard.data.data?.users?.mechanics === 'number' &&
            typeof adminDashboard.data.data?.users?.drivers === 'number' &&
            typeof adminDashboard.data.data?.requests?.total === 'number'
        );

        // 14. Admin User Management List
        const adminUsers = await makeRequest('GET', '/api/admin/users', null, {
            'Authorization': `Bearer ${adminToken}`
        });
        assert('Admin get all users returns list', adminUsers.status === 200 && Array.isArray(adminUsers.data.data));

        // 15. Admin Driver List
        const adminDrivers = await makeRequest('GET', '/api/admin/drivers', null, {
            'Authorization': `Bearer ${adminToken}`
        });
        assert('Admin get all drivers returns list', adminDrivers.status === 200 && Array.isArray(adminDrivers.data.data));

        // 16. Admin Mechanic List
        const adminMechanics = await makeRequest('GET', '/api/admin/mechanics', null, {
            'Authorization': `Bearer ${adminToken}`
        });
        assert('Admin get all mechanics returns list', adminMechanics.status === 200 && Array.isArray(adminMechanics.data.data));

        // 17. Admin Service Request List with Populations
        const adminRequests = await makeRequest('GET', '/api/admin/requests', null, {
            'Authorization': `Bearer ${adminToken}`
        });
        assert('Admin get all requests returns list with populate',
            adminRequests.status === 200 &&
            Array.isArray(adminRequests.data.data) &&
            adminRequests.data.data.length > 0
        );

        // 18. Admin Analytics
        const adminAnalytics = await makeRequest('GET', '/api/admin/analytics', null, {
            'Authorization': `Bearer ${adminToken}`
        });
        assert('Admin analytics returns 7-day trend & metrics',
            adminAnalytics.status === 200 &&
            Array.isArray(adminAnalytics.data.data?.dailyTrend) &&
            adminAnalytics.data.data.dailyTrend.length === 7 &&
            typeof adminAnalytics.data.data?.summary?.uniqueVisitors === 'number'
        );

    } catch (err) {
        console.error('Test execution error:', err);
        failed++;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }

    console.log('\n==================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================');
    process.exit(failed > 0 ? 1 : 0);
}

runTests();
