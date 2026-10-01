const mongoose = require('mongoose');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function runTests() {
    console.log('🚀 Starting TruckSathi Backend API Tests...\n');

    const timestamp = Date.now();
    const testDriver = {
        name: `Test Driver ${timestamp}`,
        email: `driver_${timestamp}@test.com`,
        phone: `9${String(timestamp).slice(-9)}`,
        password: 'Password@123'
    };

    const testMechanic1 = {
        name: `Mechanic One ${timestamp}`,
        email: `mech1_${timestamp}@test.com`,
        phone: `8${String(timestamp).slice(-9)}`,
        password: 'Password@123',
        shopName: `Garage One ${timestamp}`,
        services: ['Engine Repair', 'Brake Servicing'],
        location: {
            lat: 28.4595,
            lng: 77.0266
        }
    };

    const testMechanic2 = {
        name: `Mechanic Two ${timestamp}`,
        email: `mech2_${timestamp}@test.com`,
        phone: `7${String(timestamp).slice(-9)}`,
        password: 'Password@123',
        shopName: `Garage Two ${timestamp}`,
        services: ['Tire Repair'],
        location: {
            lat: 28.4600,
            lng: 77.0300
        }
    };

    let driverToken, mech1Token, mech2Token;
    let mech1Id, mech2Id, createdRequestId;

    // Test 1: Driver Registration
    console.log('Test 1: Driver Registration');
    let res = await fetch(`${BASE_URL}/api/auth/driver/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testDriver)
    });
    let data = await res.json();
    console.log(`Status: ${res.status} - ${JSON.stringify(data)}`);
    if (res.status !== 201) throw new Error('Driver registration failed');

    // Test 2: Mechanic 1 Registration
    console.log('\nTest 2: Mechanic 1 Registration');
    res = await fetch(`${BASE_URL}/api/auth/mechanic/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMechanic1)
    });
    data = await res.json();
    console.log(`Status: ${res.status} - success: ${data.success}`);
    if (res.status !== 201) throw new Error('Mechanic 1 registration failed');
    mech1Id = data.data._id;

    // Test 2b: Mechanic 2 Registration
    console.log('\nTest 2b: Mechanic 2 Registration');
    res = await fetch(`${BASE_URL}/api/auth/mechanic/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMechanic2)
    });
    data = await res.json();
    mech2Id = data.data._id;
    console.log(`Mechanic 2 registered with ID: ${mech2Id}`);

    // Test 3: Driver Login
    console.log('\nTest 3: Driver Login');
    res = await fetch(`${BASE_URL}/api/auth/driver/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testDriver.email, password: testDriver.password })
    });
    data = await res.json();
    console.log(`Status: ${res.status} - token received: ${!!data.token}`);
    driverToken = data.token;
    if (!driverToken) throw new Error('Driver login failed');

    // Test 4: Mechanic 1 Login
    console.log('\nTest 4: Mechanic 1 Login');
    res = await fetch(`${BASE_URL}/api/auth/mechanic/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testMechanic1.email, password: testMechanic1.password })
    });
    data = await res.json();
    mech1Token = data.token;
    console.log(`Status: ${res.status} - token received: ${!!mech1Token}`);
    if (!mech1Token) throw new Error('Mechanic 1 login failed');

    // Test 4b: Mechanic 2 Login
    res = await fetch(`${BASE_URL}/api/auth/mechanic/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testMechanic2.email, password: testMechanic2.password })
    });
    data = await res.json();
    mech2Token = data.token;

    // Test 5: Driver searches nearby mechanics (Verifying Bug 1 fix: Driver can search)
    console.log('\nTest 5: Driver searches nearby mechanics (GET /api/nearby)');
    res = await fetch(`${BASE_URL}/api/nearby?lat=28.4595&lng=77.0266&radius=10`, {
        headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    data = await res.json();
    console.log(`Status: ${res.status} - Found ${data.count} mechanics`);
    if (res.status !== 200 || !data.success) throw new Error('Nearby search failed for driver');

    // Test 6: Driver creates a service request for Mechanic 1
    console.log('\nTest 6: Driver creates service request (POST /api/requests)');
    res = await fetch(`${BASE_URL}/api/requests`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${driverToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            mechanicId: mech1Id,
            issue: 'Radiator leaking and engine overheating on NH-48',
            vehicleInfo: 'BharatBenz 2823C (HR-55-XY-9999)',
            location: {
                latitude: 28.4595,
                longitude: 77.0266,
                address: 'Near Rajiv Chowk flyover, Gurgaon'
            }
        })
    });
    data = await res.json();
    console.log(`Status: ${res.status} - Request Created ID: ${data.data?._id}, Status: ${data.data?.status}`);
    if (res.status !== 201 || !data.success) throw new Error('Service request creation failed');
    createdRequestId = data.data._id;

    // Test 7: Mechanic 1 views incoming requests
    console.log('\nTest 7: Mechanic 1 views incoming requests (GET /api/requests/mechanic)');
    res = await fetch(`${BASE_URL}/api/requests/mechanic?status=pending`, {
        headers: { 'Authorization': `Bearer ${mech1Token}` }
    });
    data = await res.json();
    console.log(`Status: ${res.status} - Found ${data.count} pending requests`);
    const foundReq = data.data.find(r => r._id === createdRequestId);
    if (!foundReq) throw new Error('Created request not found in Mechanic 1 queue');
    console.log(`Driver on request: ${foundReq.driverId.name} (${foundReq.driverId.phone})`);

    // Test 8: Mechanic 2 attempts to accept Mechanic 1's request (Security check: should fail 403)
    console.log('\nTest 8: Mechanic 2 attempts to accept Mechanic 1 request (Should be 403 Forbidden)');
    res = await fetch(`${BASE_URL}/api/requests/${createdRequestId}/accept`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${mech2Token}` }
    });
    data = await res.json();
    console.log(`Status: ${res.status} - Message: ${data.message}`);
    if (res.status !== 403) throw new Error('Security flaw: Mechanic 2 was able to access or accept Mechanic 1 request!');

    // Test 9: Mechanic 1 accepts the request
    console.log('\nTest 9: Mechanic 1 accepts the request (PATCH /api/requests/:id/accept)');
    res = await fetch(`${BASE_URL}/api/requests/${createdRequestId}/accept`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${mech1Token}` }
    });
    data = await res.json();
    console.log(`Status: ${res.status} - New Status: ${data.data?.status}, AcceptedAt: ${data.data?.acceptedAt}`);
    if (res.status !== 200 || data.data.status !== 'accepted') throw new Error('Accept request failed');

    // Test 10: Mechanic 1 attempts duplicate acceptance (Should return 409 Conflict)
    console.log('\nTest 10: Duplicate accept attempt (Should return 409 Conflict)');
    res = await fetch(`${BASE_URL}/api/requests/${createdRequestId}/accept`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${mech1Token}` }
    });
    data = await res.json();
    console.log(`Status: ${res.status} - Message: ${data.message}`);
    if (res.status !== 409) throw new Error('State validation flaw: duplicate accept did not return 409 Conflict');

    // Test 11: Driver checks request status (GET /api/requests/driver)
    console.log('\nTest 11: Driver checks requests (GET /api/requests/driver)');
    res = await fetch(`${BASE_URL}/api/requests/driver`, {
        headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    data = await res.json();
    console.log(`Status: ${res.status} - Driver request count: ${data.count}`);
    const driverReq = data.data.find(r => r._id === createdRequestId);
    if (!driverReq || driverReq.status !== 'accepted') throw new Error('Driver did not see accepted status');
    console.log(`Driver confirmed status: ${driverReq.status} by Mechanic: ${driverReq.mechanicId.name} (${driverReq.mechanicId.shopName})`);

    // Test 12: Mechanic profile update bug fix verification
    console.log('\nTest 12: Mechanic profile update verification (PUT /api/update/mechanic/profile)');
    res = await fetch(`${BASE_URL}/api/update/mechanic/profile`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${mech1Token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Updated Rajesh Mechanic' })
    });
    data = await res.json();
    console.log(`Status: ${res.status} - Updated Name: ${data.mechanic?.name}, Password leaked?: ${!!data.mechanic?.password}`);
    if (res.status !== 200 || data.mechanic?.password) throw new Error('Mechanic profile update failed or leaked password');

    // Test 13: Driver profile update bug fix verification
    console.log('\nTest 13: Driver profile update verification (PUT /api/update/driver/profile)');
    res = await fetch(`${BASE_URL}/api/update/driver/profile`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${driverToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Updated Driver Name' })
    });
    data = await res.json();
    console.log(`Status: ${res.status} - Updated Driver: ${data.driver?.name}, Password leaked?: ${!!data.driver?.password}`);
    if (res.status !== 200 || data.driver?.password) throw new Error('Driver profile update failed or leaked password');

    console.log('\n🎉 ALL 13 TEST CASES PASSED SUCCESSFULLY! Clean, secure, and fully verified.\n');
}

runTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
