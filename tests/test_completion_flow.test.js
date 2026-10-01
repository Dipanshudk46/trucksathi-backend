const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ServiceRequest = require('../src/models/serviceRequest.Model');

const BASE_URL = 'http://localhost:3000';

async function api(method, pathName, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${pathName}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
}

async function run13StepCriticalTest() {
    console.log('\nRunning Service Request Lifecycle Tests...\n');

    let passed = 0;
    let failed = 0;

    function assert(stepNum, desc, condition, details = '') {
        if (condition) {
            console.log(`[PASS] Step ${stepNum}: ${desc}`);
            passed++;
        } else {
            console.error(`[FAIL] Step ${stepNum}: ${desc} - ${details}`);
            failed++;
        }
    }

    try {
        const timestamp = Date.now();

        // Register and login driver
        const driverEmail = `flow_driver_${timestamp}@test.com`;
        const driverPhone = `9${String(timestamp).slice(-9)}`;
        await api('POST', '/api/auth/driver/register', {
            name: 'Flow Driver',
            email: driverEmail,
            phone: driverPhone,
            password: 'Password@123'
        });
        const driverLoginRes = await api('POST', '/api/auth/driver/login', {
            email: driverEmail,
            password: 'Password@123'
        });
        const driverToken = driverLoginRes.data?.token;

        // Register and login mechanic
        const mechEmail = `flow_mech_${timestamp}@test.com`;
        const mechPhone = `8${String(timestamp).slice(-9)}`;
        await api('POST', '/api/auth/mechanic/register', {
            name: 'Flow Mechanic',
            email: mechEmail,
            phone: mechPhone,
            password: 'Password@123',
            shopName: 'Flow Auto Garage',
            services: ['Engine Repair', 'Brake Service'],
            location: { lat: 28.4595, lng: 77.0266 }
        });
        const mechLoginRes = await api('POST', '/api/auth/mechanic/login', {
            email: mechEmail,
            password: 'Password@123'
        });
        const mechToken = mechLoginRes.data?.token;
        const mechProfileRes = await api('GET', '/api/mechanic/profile', null, mechToken);
        const mechId = mechProfileRes.data?.data?._id || mechProfileRes.data?._id;

        // 1. Create a request as driver
        const createRes = await api('POST', '/api/requests', {
            mechanicId: mechId,
            issue: 'Alternator failure and dead battery on NH-48',
            vehicleInfo: 'BharatBenz 2823R',
            location: { latitude: 28.4595, longitude: 77.0266, address: 'NH-48 Milestone 37' }
        }, driverToken);
        const requestId = createRes.data?.data?._id;
        assert(1, 'Create request as driver', createRes.status === 201 && createRes.data?.data?.status === 'pending');

        // 2. Accept it as mechanic
        const acceptRes = await api('PATCH', `/api/requests/${requestId}/accept`, {}, mechToken);
        assert(2, 'Accept request as mechanic (status: accepted)', acceptRes.status === 200 && acceptRes.data?.data?.status === 'accepted' && !!acceptRes.data?.data?.acceptedAt);

        // 3. Click: Start Assistance
        const startRes = await api('PATCH', `/api/requests/${requestId}/start`, {}, mechToken);
        assert(3, 'Start Assistance (status: in_progress)', startRes.status === 200 && startRes.data?.data?.status === 'in_progress' && !!startRes.data?.data?.startedAt);

        // 4. Refresh mechanic dashboard
        const mechRefresh1 = await api('GET', '/api/requests/mechanic', null, mechToken);
        const reqInMech1 = mechRefresh1.data?.data?.find(r => r._id?.toString() === requestId?.toString());
        assert(4, 'Refresh mechanic dashboard (still in_progress)', reqInMech1 && reqInMech1.status === 'in_progress');

        // 5. Click: Mark Assistance Completed
        const completeRes = await api('PATCH', `/api/requests/${requestId}/complete`, {}, mechToken);
        assert(5, 'Mark Assistance Completed (backend returns completed)', completeRes.status === 200 && completeRes.data?.data?.status === 'completed' && !!completeRes.data?.data?.completedAt);

        // 6. Refresh mechanic dashboard -> request is NOT in Active Accepted Jobs
        const mechRefresh2 = await api('GET', '/api/requests/mechanic', null, mechToken);
        const allMechReqs = mechRefresh2.data?.data || [];
        const activeJobs = allMechReqs.filter(r => r.status === 'accepted' || r.status === 'in_progress');
        const isActiveStill = activeJobs.some(r => r._id?.toString() === requestId?.toString());
        assert(6, 'Refresh mechanic dashboard (request is NOT in Active Accepted Jobs)', !isActiveStill && activeJobs.length === 0);

        // 7. Open Work Queue -> Completed
        const completedFilterRes = await api('GET', '/api/requests/mechanic?status=completed', null, mechToken);
        const completedList = completedFilterRes.data?.data || [];
        const isFoundInCompleted = completedList.some(r => r._id?.toString() === requestId?.toString());
        assert(7, 'Open Work Queue -> Completed (request appears there)', isFoundInCompleted);

        // 8. Refresh browser again -> request remains completed
        const mechRefresh3 = await api('GET', '/api/requests/mechanic', null, mechToken);
        const reqInMech3 = mechRefresh3.data?.data?.find(r => r._id?.toString() === requestId?.toString());
        assert(8, 'Refresh browser again (request remains completed)', reqInMech3 && reqInMech3.status === 'completed');

        // 9. Open driver dashboard -> driver sees Assistance Completed
        const driverRefresh = await api('GET', '/api/requests/driver', null, driverToken);
        const reqInDriver = driverRefresh.data?.data?.find(r => r._id?.toString() === requestId?.toString());
        assert(9, 'Open driver dashboard (driver sees status: completed and completedAt)', reqInDriver && reqInDriver.status === 'completed' && !!reqInDriver.completedAt);

        // 10. Wait for polling cycle -> verify completed status MUST NOT revert
        await new Promise(resolve => setTimeout(resolve, 1500));
        const polledReqs = await api('GET', '/api/requests/mechanic', null, mechToken);
        const polledItem = polledReqs.data?.data?.find(r => r._id?.toString() === requestId?.toString());
        assert(10, 'Wait for polling cycle (completed status MUST NOT revert)', polledItem && polledItem.status === 'completed');

        // 11. Try directly completing the request again -> backend rejects (400)
        const reCompleteRes = await api('PATCH', `/api/requests/${requestId}/complete`, {}, mechToken);
        assert(11, 'Try directly completing again (backend rejects 400)', reCompleteRes.status === 400);

        // 12. Try starting the completed request -> backend rejects (400)
        const reStartRes = await api('PATCH', `/api/requests/${requestId}/start`, {}, mechToken);
        assert(12, 'Try starting completed request (backend rejects 400)', reStartRes.status === 400);

        // 13. Check database -> status = completed, completedAt exists, timestamps preserved
        if (mongoose.connection.readyState === 0 && process.env.MONGO_URI) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        const dbDoc = await ServiceRequest.findById(requestId);
        assert(13, 'Check database (status = completed, completedAt exists, acceptedAt & startedAt preserved)',
            dbDoc &&
            dbDoc.status === 'completed' &&
            !!dbDoc.completedAt &&
            !!dbDoc.startedAt &&
            !!dbDoc.acceptedAt
        );

    } catch (err) {
        console.error('Critical test error:', err);
        failed++;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }

    console.log('\n==================================================');
    console.log(`CRITICAL TEST RESULTS: ${passed}/13 PASSED, ${failed} FAILED`);
    console.log('==================================================');
    process.exit(failed > 0 ? 1 : 0);
}

run13StepCriticalTest();
