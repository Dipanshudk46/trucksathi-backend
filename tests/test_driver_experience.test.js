/**
 * Driver Experience & Lifecycle Verification Test
 */
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

async function run() {
  console.log('\nRunning Driver Experience Tests...\n');

  const ts = Date.now();
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Register driver
    const driverEmail = `driver_test_${ts}@trucksathi.test`;
    const driverPhone = `98${String(ts).slice(-8)}`;
    const driverReg = await makeRequest('POST', '/api/auth/driver/register', {
      name: `Driver Test ${ts}`,
      email: driverEmail,
      phone: driverPhone,
      password: 'Password@123',
    });
    assert(driverReg.status === 201 || driverReg.status === 200, 'Driver registered successfully');

    const driverLogin = await makeRequest('POST', '/api/auth/driver/login', {
      email: driverEmail,
      password: 'Password@123',
    });
    const driverToken = driverLogin.data?.token;
    assert(driverLogin.status === 200 && !!driverToken, 'Driver logged in and received JWT token');

    // 2. Register mechanic
    const mechEmail = `mech_test_${ts}@trucksathi.test`;
    const mechPhone = `97${String(ts).slice(-8)}`;
    const mechReg = await makeRequest('POST', '/api/auth/mechanic/register', {
      name: `Mechanic Test ${ts}`,
      email: mechEmail,
      phone: mechPhone,
      password: 'Password@123',
      shopName: 'NH44 Speed Garage',
      location: {
        lat: 12.9716,
        lng: 77.5946,
        address: 'NH44 Milestone 42, Electronic City',
      },
      services: ['Engine', 'Brake', 'Electricals'],
    });
    assert(mechReg.status === 201 || mechReg.status === 200, 'Mechanic registered with shop details and coordinates');

    const mechLogin = await makeRequest('POST', '/api/auth/mechanic/login', {
      email: mechEmail,
      password: 'Password@123',
    });
    const mechToken = mechLogin.data?.token;
    assert(mechLogin.status === 200 && !!mechToken, 'Mechanic logged in and received JWT token');

    // Fetch Mechanic Profile for ID
    const mechProfile = await makeRequest('GET', '/api/mechanic/profile', null, {
      Authorization: `Bearer ${mechToken}`,
    });
    const mechId = mechProfile.data?.data?._id || mechProfile.data?._id;
    assert(!!mechId, 'Mechanic profile fetched with ID');

    // 3. Driver creates request 1 (to be cancelled)
    const req1Res = await makeRequest(
      'POST',
      '/api/requests',
      {
        mechanicId: mechId,
        issue: 'Engine Overheating - Smoke coming from radiator',
        vehicleInfo: 'Heavy Truck (16 wheeler)',
        location: {
          latitude: 12.972,
          longitude: 77.595,
          address: 'Near Toll Plaza KM 42',
        },
      },
      { Authorization: `Bearer ${driverToken}` }
    );
    const req1 = req1Res.data?.data || req1Res.data;
    assert(req1Res.status === 201 && req1?.status === 'pending', 'Driver created Request 1 with pending status');
    const req1Id = req1._id;

    // 4. Driver cancels pending Request 1
    const cancelRes = await makeRequest(
      'PATCH',
      `/api/requests/${req1Id}/cancel`,
      {},
      { Authorization: `Bearer ${driverToken}` }
    );
    const cancelData = cancelRes.data?.data || cancelRes.data;
    assert(cancelRes.status === 200 && cancelData?.status === 'cancelled', 'Driver successfully cancelled pending Request 1');

    // 5. Driver creates request 2 (full lifecycle)
    const req2Res = await makeRequest(
      'POST',
      '/api/requests',
      {
        mechanicId: mechId,
        issue: 'Brake Failure - Air brake pressure dropping rapidly',
        vehicleInfo: 'Tata Prima 4028.S',
        location: {
          latitude: 12.971,
          longitude: 77.594,
          address: 'Near Milestone 110, Highway NH44',
        },
      },
      { Authorization: `Bearer ${driverToken}` }
    );
    const req2 = req2Res.data?.data || req2Res.data;
    assert(req2Res.status === 201 && req2?.status === 'pending', 'Driver created Request 2 with pending status');
    const req2Id = req2._id;

    // 6. Mechanic accepts Request 2
    const acceptRes = await makeRequest(
      'PATCH',
      `/api/requests/${req2Id}/accept`,
      {},
      { Authorization: `Bearer ${mechToken}` }
    );
    const acceptData = acceptRes.data?.data || acceptRes.data;
    assert(acceptRes.status === 200 && acceptData?.status === 'accepted', 'Mechanic accepted Request 2');

    // 7. Check driver sees accepted status with mechanic details populated
    const driverFetchReq2 = await makeRequest(
      'GET',
      `/api/requests/${req2Id}`,
      null,
      { Authorization: `Bearer ${driverToken}` }
    );
    const fetchedReq2 = driverFetchReq2.data?.data || driverFetchReq2.data;
    assert(driverFetchReq2.status === 200, 'Driver fetched request details');
    assert(
      fetchedReq2.mechanicId && fetchedReq2.mechanicId.name.includes('Mechanic Test'),
      'Driver sees mechanic name populated'
    );
    assert(
      fetchedReq2.mechanicId.shopName === 'NH44 Speed Garage',
      'Driver sees mechanic shopName populated'
    );
    assert(
      fetchedReq2.mechanicId.phone === mechPhone,
      'Driver sees mechanic phone populated for calling'
    );
    assert(
      fetchedReq2.mechanicId.location && (fetchedReq2.mechanicId.location.lat || fetchedReq2.mechanicId.location.coordinates),
      'Driver receives mechanic coordinates for Google Maps navigation'
    );

    // 8. Mechanic starts assistance
    const startRes = await makeRequest(
      'PATCH',
      `/api/requests/${req2Id}/start`,
      {},
      { Authorization: `Bearer ${mechToken}` }
    );
    const startData = startRes.data?.data || startRes.data;
    assert(startRes.status === 200 && startData?.status === 'in_progress', 'Mechanic started assistance (in_progress)');

    // 9. Mechanic completes assistance
    const completeRes = await makeRequest(
      'PATCH',
      `/api/requests/${req2Id}/complete`,
      {},
      { Authorization: `Bearer ${mechToken}` }
    );
    const completeData = completeRes.data?.data || completeRes.data;
    assert(completeRes.status === 200 && completeData?.status === 'completed', 'Mechanic completed assistance (completed)');

    // 10. Check driver's my requests list
    const myReqsRes = await makeRequest(
      'GET',
      '/api/requests/driver',
      null,
      { Authorization: `Bearer ${driverToken}` }
    );
    const myReqs = myReqsRes.data?.data || myReqsRes.data;
    assert(myReqsRes.status === 200 && Array.isArray(myReqs), 'Driver fetched My Requests list');

    const completedJob = myReqs.find((r) => r._id === req2Id);
    const cancelledJob = myReqs.find((r) => r._id === req1Id);

    assert(completedJob && completedJob.status === 'completed', 'Request 2 is completed in driver history');
    assert(completedJob?.completedAt, 'completedJob has completedAt timestamp');
    assert(completedJob?.acceptedAt, 'completedJob has acceptedAt timestamp');
    assert(completedJob?.startedAt, 'completedJob has startedAt timestamp');
    assert(cancelledJob && cancelledJob.status === 'cancelled', 'Request 1 is cancelled in driver history');

    // Filter verification
    const activeJobs = myReqs.filter((r) => ['pending', 'accepted', 'in_progress'].includes(r.status));
    const completedJobs = myReqs.filter((r) => r.status === 'completed');
    const cancelledJobs = myReqs.filter((r) => r.status === 'cancelled');

    assert(activeJobs.length === 0, 'Zero active requests remain for driver');
    assert(completedJobs.length === 1, '1 completed request in driver filter');
    assert(cancelledJobs.length === 1, '1 cancelled request in driver filter');

    console.log('\n==================================================');
    console.log(`DRIVER TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');
  } catch (err) {
    console.error('Fatal error during driver test:', err);
    process.exit(1);
  }
}

run();
