/**
 * TruckSathi Services Layer Unit & Integration Test Suite
 * Validates business logic, state machine transitions, ownership boundaries,
 * error handling, and cooldown behavior across all 6 service modules.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');

// Models for test fixture cleanup
const Driver = require('../src/models/driver.Model');
const Mechanic = require('../src/models/mechanic.Model');
const ServiceRequest = require('../src/models/serviceRequest.Model');
const Visit = require('../src/models/visit.Model');
const Admin = require('../src/models/admin.Model');

// Services under test
const AuthService = require('../src/services/auth.Service');
const DriverService = require('../src/services/driver.Service');
const MechanicService = require('../src/services/mechanic.Service');
const RequestService = require('../src/services/request.Service');
const AnalyticsService = require('../src/services/analytics.Service');
const AdminService = require('../src/services/admin.Service');

const AppError = require('../src/utils/AppError.Utils');
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

async function runServicesTestSuite() {
    console.log('\nRunning Services Layer Tests...\n');

    await connectDB();

    const timestamp = Date.now();
    const testTag = `srv_${timestamp}`;

    // Test artifacts tracking for cleanup
    const createdDriverIds = [];
    const createdMechanicIds = [];
    const createdRequestIds = [];
    const testVisitorIds = [];

    try {
        // ====================================================
        // 1. AUTH SERVICE TESTS
        // ====================================================
        console.log('\n--- 1. AuthService Tests ---');

        const driverEmail = `${testTag}_driver@trucksathi.test`;
        const driverPhone = `9${String(timestamp).slice(-9)}`;
        const driverPassword = 'StrongPassword@123';

        // 1.1 Valid driver registration
        const registeredDriver = await AuthService.registerDriver({
            name: 'Service Driver One',
            email: driverEmail,
            phone: driverPhone,
            password: driverPassword
        });
        createdDriverIds.push(registeredDriver._id);

        assert('Valid driver registration succeeds without password in returned object',
            registeredDriver && registeredDriver.email === driverEmail && !registeredDriver.password);

        // 1.2 Duplicate driver email handling
        let duplicateEmailError = null;
        try {
            await AuthService.registerDriver({
                name: 'Duplicate Driver',
                email: driverEmail,
                phone: `8${String(timestamp).slice(-9)}`,
                password: driverPassword
            });
        } catch (err) {
            duplicateEmailError = err;
        }
        assert('Duplicate driver email throws AppError 400 (EMAIL_EXISTS)',
            duplicateEmailError instanceof AppError && duplicateEmailError.statusCode === 400 && duplicateEmailError.code === 'EMAIL_EXISTS');

        // 1.3 Duplicate driver phone handling
        let duplicatePhoneError = null;
        try {
            await AuthService.registerDriver({
                name: 'Duplicate Phone Driver',
                email: `other_${driverEmail}`,
                phone: driverPhone,
                password: driverPassword
            });
        } catch (err) {
            duplicatePhoneError = err;
        }
        assert('Duplicate driver phone throws AppError 400 (PHONE_EXISTS)',
            duplicatePhoneError instanceof AppError && duplicatePhoneError.statusCode === 400 && duplicatePhoneError.code === 'PHONE_EXISTS');

        // 1.4 Valid driver login
        const driverLoginResult = await AuthService.loginDriver(driverEmail, driverPassword);
        assert('Valid driver login returns JWT token and user info',
            driverLoginResult && driverLoginResult.token && driverLoginResult.user && driverLoginResult.user.role === 'driver');

        // 1.5 Invalid driver password handling
        let invalidPasswordError = null;
        try {
            await AuthService.loginDriver(driverEmail, 'WrongPassword@999');
        } catch (err) {
            invalidPasswordError = err;
        }
        assert('Invalid driver password throws AppError 400 (INVALID_CREDENTIALS)',
            invalidPasswordError instanceof AppError && invalidPasswordError.statusCode === 400 && invalidPasswordError.code === 'INVALID_CREDENTIALS');

        // 1.6 Valid mechanic registration
        const mechEmail = `${testTag}_mech@trucksathi.test`;
        const mechPhone = `7${String(timestamp).slice(-9)}`;
        const mechPassword = 'MechanicPassword@123';

        const registeredMechanic = await AuthService.registerMechanic({
            name: 'Service Mechanic One',
            email: mechEmail,
            phone: mechPhone,
            password: mechPassword,
            shopName: 'QuickFix Garage',
            services: ['Engine Repair', 'Brake Servicing'],
            location: { lat: 28.6139, lng: 77.2090 }
        });
        createdMechanicIds.push(registeredMechanic._id);

        assert('Valid mechanic registration succeeds without password in returned object',
            registeredMechanic && registeredMechanic.email === mechEmail && !registeredMechanic.password);

        // 1.7 Valid mechanic login
        const mechLoginResult = await AuthService.loginMechanic(mechEmail, mechPassword);
        assert('Valid mechanic login returns JWT token and user info',
            mechLoginResult && mechLoginResult.token && mechLoginResult.user && mechLoginResult.user.role === 'mechanic');

        // 1.8 Admin login (using seeded admin or create temporary admin fixture)
        let adminUser = await Admin.findOne({ email: 'admin@trucksathi.com' });
        const adminPass = 'Admin@123';
        if (!adminUser) {
            const hashedAdminPass = await PasswordHelper.hashPassword(adminPass, 10);
            adminUser = await Admin.create({
                name: 'System Admin',
                email: 'admin@trucksathi.com',
                password: hashedAdminPass
            });
        } else {
            // Update password for testing
            adminUser.password = await PasswordHelper.hashPassword(adminPass, 10);
            await adminUser.save();
        }

        const adminLoginResult = await AuthService.loginAdmin('admin@trucksathi.com', adminPass);
        assert('Valid admin login returns JWT token with admin role',
            adminLoginResult && adminLoginResult.token && adminLoginResult.user && adminLoginResult.user.role === 'admin');

        // ====================================================
        // 2. DRIVER SERVICE TESTS
        // ====================================================
        console.log('\n--- 2. DriverService Tests ---');

        // 2.1 Profile retrieval
        const driverProfile = await DriverService.getProfile(registeredDriver._id.toString());
        assert('DriverService.getProfile returns profile without password',
            driverProfile && driverProfile.email === driverEmail && !driverProfile.password);

        // 2.2 Profile update
        const updatedDriver = await DriverService.updateProfile(registeredDriver._id.toString(), {
            name: 'Updated Driver Name'
        });
        assert('DriverService.updateProfile updates specified fields',
            updatedDriver && updatedDriver.name === 'Updated Driver Name');

        // 2.3 Non-existent driver handling
        let nonExistentDriverError = null;
        try {
            await DriverService.getProfile(new mongoose.Types.ObjectId().toString());
        } catch (err) {
            nonExistentDriverError = err;
        }
        assert('DriverService.getProfile for non-existent driver throws AppError 400',
            nonExistentDriverError instanceof AppError && nonExistentDriverError.statusCode === 400);

        // ====================================================
        // 3. MECHANIC SERVICE TESTS
        // ====================================================
        console.log('\n--- 3. MechanicService Tests ---');

        // 3.1 Profile retrieval
        const mechProfile = await MechanicService.getProfile(registeredMechanic._id.toString());
        assert('MechanicService.getProfile returns profile without password',
            mechProfile && mechProfile.email === mechEmail && !mechProfile.password);

        // 3.2 Profile update with services and location
        const updatedMech = await MechanicService.updateProfile(registeredMechanic._id.toString(), {
            shopName: 'Elite Auto Repair',
            services: ['Engine Repair', 'Highway Towing'],
            location: { lat: 28.6200, lng: 77.2100 }
        });
        assert('MechanicService.updateProfile updates shopName and validated services catalog',
            updatedMech && updatedMech.shopName === 'Elite Auto Repair' && updatedMech.services.includes('Highway Towing'));

        // 3.3 Availability update
        const availableMech = await MechanicService.updateAvailability(registeredMechanic._id.toString(), true);
        assert('MechanicService.updateAvailability toggles availability to true',
            availableMech && availableMech.isAvailable === true);

        // 3.4 Nearby mechanic search
        const nearbyMechanics = await MechanicService.searchNearby({
            latitude: 28.6200,
            longitude: 77.2100,
            radiusInKm: 10
        });
        assert('MechanicService.searchNearby finds online mechanics with calculated distance',
            Array.isArray(nearbyMechanics) && nearbyMechanics.length > 0 && typeof nearbyMechanics[0].distance === 'number');

        // ====================================================
        // 4. REQUEST SERVICE LIFECYCLE TESTS
        // ====================================================
        console.log('\n--- 4. RequestService Lifecycle & State Machine Tests ---');

        // Register a second mechanic to test unauthorized ownership attempts
        const secondMechEmail = `${testTag}_mech2@trucksathi.test`;
        const registeredMech2 = await AuthService.registerMechanic({
            name: 'Service Mechanic Two',
            email: secondMechEmail,
            phone: `6${String(timestamp).slice(-9)}`,
            password: 'MechPassword@123',
            shopName: 'Other Workshop',
            services: ['Tire Puncture & Replacement'],
            location: { lat: 28.5000, lng: 77.1000 }
        });
        createdMechanicIds.push(registeredMech2._id);
        await MechanicService.updateAvailability(registeredMech2._id.toString(), true);

        // 4.1 Create request (status: pending)
        const newRequest = await RequestService.createRequest({
            driverId: registeredDriver._id.toString(),
            mechanicId: registeredMechanic._id.toString(),
            issue: 'Flat tyre and overheating engine',
            vehicleInfo: 'Tata Prima 4028.S',
            location: { latitude: 28.6150, longitude: 77.2095, address: 'Connaught Place' }
        });
        createdRequestIds.push(newRequest._id);

        assert('RequestService.createRequest initializes request with status: pending and populated details',
            newRequest && newRequest.status === 'pending' && newRequest.mechanicId && newRequest.driverId);

        // 4.2 Retrieve request by ID (authorized driver and authorized mechanic)
        const fetchedByDriver = await RequestService.getRequestById(newRequest._id.toString(), registeredDriver._id.toString());
        assert('Authorized driver can retrieve request by ID',
            fetchedByDriver && fetchedByDriver._id.toString() === newRequest._id.toString());

        const fetchedByMech = await RequestService.getRequestById(newRequest._id.toString(), registeredMechanic._id.toString());
        assert('Assigned mechanic can retrieve request by ID',
            fetchedByMech && fetchedByMech._id.toString() === newRequest._id.toString());

        // 4.3 Unauthorized user cannot retrieve request (AppError 403)
        let unauthorizedViewError = null;
        try {
            await RequestService.getRequestById(newRequest._id.toString(), registeredMech2._id.toString());
        } catch (err) {
            unauthorizedViewError = err;
        }
        assert('Unauthorized mechanic attempting to view request gets AppError 403 (FORBIDDEN)',
            unauthorizedViewError instanceof AppError && unauthorizedViewError.statusCode === 403);

        // 4.4 Driver and Mechanic request history
        const driverHistory = await RequestService.getDriverRequests(registeredDriver._id.toString());
        assert('RequestService.getDriverRequests returns list containing created request',
            Array.isArray(driverHistory) && driverHistory.some(r => r._id.toString() === newRequest._id.toString()));

        const mechHistory = await RequestService.getMechanicRequests(registeredMechanic._id.toString());
        assert('RequestService.getMechanicRequests returns list containing assigned request',
            Array.isArray(mechHistory) && mechHistory.some(r => r._id.toString() === newRequest._id.toString()));

        // 4.5 Unauthorized mechanic cannot accept request
        let unauthorizedAcceptError = null;
        try {
            await RequestService.acceptRequest(newRequest._id.toString(), registeredMech2._id.toString());
        } catch (err) {
            unauthorizedAcceptError = err;
        }
        assert('Unassigned mechanic attempting to accept request gets AppError 403 (FORBIDDEN)',
            unauthorizedAcceptError instanceof AppError && unauthorizedAcceptError.statusCode === 403);

        // 4.6 Assigned mechanic accepts request (pending -> accepted)
        const acceptedRequest = await RequestService.acceptRequest(newRequest._id.toString(), registeredMechanic._id.toString());
        assert('Assigned mechanic accepts pending request; status becomes accepted with acceptedAt timestamp',
            acceptedRequest && acceptedRequest.status === 'accepted' && acceptedRequest.acceptedAt);

        // 4.7 Duplicate acceptance returns AppError 409 (ALREADY_ACCEPTED)
        let duplicateAcceptError = null;
        try {
            await RequestService.acceptRequest(newRequest._id.toString(), registeredMechanic._id.toString());
        } catch (err) {
            duplicateAcceptError = err;
        }
        assert('Accepting already accepted request throws AppError 409 (ALREADY_ACCEPTED)',
            duplicateAcceptError instanceof AppError && duplicateAcceptError.statusCode === 409 && duplicateAcceptError.code === 'ALREADY_ACCEPTED');

        // 4.8 Cannot complete accepted request directly without starting (must be in_progress)
        let invalidCompleteError = null;
        try {
            await RequestService.completeRequest(newRequest._id.toString(), registeredMechanic._id.toString());
        } catch (err) {
            invalidCompleteError = err;
        }
        assert('Attempting to complete request directly from accepted status throws AppError 400',
            invalidCompleteError instanceof AppError && invalidCompleteError.statusCode === 400);

        // 4.9 Start assistance (accepted -> in_progress)
        const inProgressRequest = await RequestService.startRequest(newRequest._id.toString(), registeredMechanic._id.toString());
        assert('Assigned mechanic starts assistance; status becomes in_progress with startedAt timestamp',
            inProgressRequest && inProgressRequest.status === 'in_progress' && inProgressRequest.startedAt);

        // 4.10 Complete assistance (in_progress -> completed)
        const completedRequest = await RequestService.completeRequest(newRequest._id.toString(), registeredMechanic._id.toString());
        assert('Assigned mechanic completes assistance; status becomes completed with completedAt timestamp',
            completedRequest && completedRequest.status === 'completed' && completedRequest.completedAt);

        // 4.11 Cannot cancel completed request
        let cancelCompletedError = null;
        try {
            await RequestService.cancelRequest(newRequest._id.toString(), registeredDriver._id.toString());
        } catch (err) {
            cancelCompletedError = err;
        }
        assert('Attempting to cancel completed request throws AppError 400',
            cancelCompletedError instanceof AppError && cancelCompletedError.statusCode === 400);

        // 4.12 Test Cancellation on a separate pending request
        const requestToCancel = await RequestService.createRequest({
            driverId: registeredDriver._id.toString(),
            mechanicId: registeredMechanic._id.toString(),
            issue: 'Test cancellation issue'
        });
        createdRequestIds.push(requestToCancel._id);

        const cancelledRequest = await RequestService.cancelRequest(requestToCancel._id.toString(), registeredDriver._id.toString());
        assert('Driver cancels pending request; status transitions to cancelled with cancelledAt timestamp',
            cancelledRequest && cancelledRequest.status === 'cancelled' && cancelledRequest.cancelledAt);

        // 4.13 Test Rejection on a separate pending request
        const requestToReject = await RequestService.createRequest({
            driverId: registeredDriver._id.toString(),
            mechanicId: registeredMechanic._id.toString(),
            issue: 'Test rejection issue'
        });
        createdRequestIds.push(requestToReject._id);

        const rejectedRequest = await RequestService.rejectRequest(requestToReject._id.toString(), registeredMechanic._id.toString());
        assert('Mechanic rejects pending request; status transitions to rejected',
            rejectedRequest && rejectedRequest.status === 'rejected');

        // 4.14 Test Expired Request Behavior (> 30 minutes old)
        const expiredRequestFixture = await ServiceRequest.create({
            driverId: registeredDriver._id,
            mechanicId: registeredMechanic._id,
            issue: 'Old request that sat pending for too long',
            status: 'pending',
            createdAt: new Date(Date.now() - 35 * 60 * 1000) // 35 minutes ago
        });
        createdRequestIds.push(expiredRequestFixture._id);

        let expiredAcceptError = null;
        try {
            await RequestService.acceptRequest(expiredRequestFixture._id.toString(), registeredMechanic._id.toString());
        } catch (err) {
            expiredAcceptError = err;
        }
        assert('Accepting pending request older than 30 minutes marks it expired and throws AppError 400 (REQUEST_EXPIRED)',
            expiredAcceptError instanceof AppError && expiredAcceptError.statusCode === 400 && expiredAcceptError.code === 'REQUEST_EXPIRED');

        const updatedExpired = await ServiceRequest.findById(expiredRequestFixture._id);
        assert('Expired request status updated to expired in database',
            updatedExpired && updatedExpired.status === 'expired');

        // ====================================================
        // 5. ANALYTICS SERVICE TESTS
        // ====================================================
        console.log('\n--- 5. AnalyticsService Tests ---');

        const visitorIdA = `visitor_test_${timestamp}_A`;
        const visitorIdB = `visitor_test_${timestamp}_B`;
        testVisitorIds.push(visitorIdA, visitorIdB);

        // 5.1 First visit is recorded
        const visit1 = await AnalyticsService.recordVisit({
            visitorId: visitorIdA,
            path: '/find-mechanic',
            ip: '127.0.0.1',
            userAgent: 'TestBrowser/1.0'
        });
        assert('AnalyticsService.recordVisit records first visit (recorded: true)',
            visit1 && visit1.recorded === true && visit1.visit);

        // 5.2 Second visit within 15-minute cooldown window is debounced
        const visit2 = await AnalyticsService.recordVisit({
            visitorId: visitorIdA,
            path: '/find-mechanic',
            ip: '127.0.0.1',
            userAgent: 'TestBrowser/1.0'
        });
        assert('AnalyticsService.recordVisit respects 15-minute cooldown (recorded: false)',
            visit2 && visit2.recorded === false && visit2.message.includes('cooldown'));

        // 5.3 Different visitor is recorded immediately
        const visit3 = await AnalyticsService.recordVisit({
            visitorId: visitorIdB,
            path: '/about',
            ip: '127.0.0.1',
            userAgent: 'TestBrowser/1.0'
        });
        assert('Distinct visitorId records successfully even within first visitor cooldown window',
            visit3 && visit3.recorded === true);

        // 5.4 Unique visitor count
        const uniqueCount = await AnalyticsService.getUniqueVisitorCount();
        assert('AnalyticsService.getUniqueVisitorCount returns positive integer count',
            typeof uniqueCount === 'number' && uniqueCount >= 2);

        // 5.5 Daily trends calculation
        const trends = await AnalyticsService.getDailyTrends(7);
        assert('AnalyticsService.getDailyTrends returns 7 continuous daily data points',
            Array.isArray(trends) && trends.length === 7 && trends[6].visits >= 1);

        // 5.6 Analytics summary aggregation
        const analyticsSummary = await AnalyticsService.getAnalyticsSummary();
        assert('AnalyticsService.getAnalyticsSummary returns complete summary metrics and 7-day trend',
            analyticsSummary && analyticsSummary.summary && typeof analyticsSummary.summary.totalVisits === 'number' && Array.isArray(analyticsSummary.dailyTrend));

        // ====================================================
        // 6. ADMIN SERVICE TESTS
        // ====================================================
        console.log('\n--- 6. AdminService Tests ---');

        // 6.1 Dashboard statistics
        const dashboardStats = await AdminService.getDashboardStats();
        assert('AdminService.getDashboardStats returns users, requests, and visits breakdowns',
            dashboardStats && dashboardStats.users && dashboardStats.requests && dashboardStats.visits);

        // 6.2 Get all users with search filtering
        const allUsers = await AdminService.getAllUsers({ search: 'Updated Driver' });
        assert('AdminService.getAllUsers returns normalized user list matching search query',
            Array.isArray(allUsers) && allUsers.some(u => u.name === 'Updated Driver Name'));

        // 6.3 Get all drivers with request counts
        const allDrivers = await AdminService.getAllDrivers();
        const testDriverWithCount = allDrivers.find(d => d._id.toString() === registeredDriver._id.toString());
        assert('AdminService.getAllDrivers returns drivers with computed requestCount',
            Array.isArray(allDrivers) && testDriverWithCount && typeof testDriverWithCount.requestCount === 'number' && testDriverWithCount.requestCount >= 1);

        // 6.4 Get all mechanics with request counts
        const allMechanics = await AdminService.getAllMechanics();
        const testMechWithCount = allMechanics.find(m => m._id.toString() === registeredMechanic._id.toString());
        assert('AdminService.getAllMechanics returns mechanics with computed requestCount',
            Array.isArray(allMechanics) && testMechWithCount && typeof testMechWithCount.requestCount === 'number');

        // 6.5 Get all requests with status filtering
        const completedRequestsList = await AdminService.getAllRequests({ status: 'completed' });
        assert('AdminService.getAllRequests filters requests by status',
            Array.isArray(completedRequestsList) && completedRequestsList.every(r => r.status === 'completed'));

        // 6.6 Admin analytics delegation
        const adminAnalytics = await AdminService.getAnalytics();
        assert('AdminService.getAnalytics returns summary and daily trends via AnalyticsService',
            adminAnalytics && adminAnalytics.summary && Array.isArray(adminAnalytics.dailyTrend));

    } catch (testError) {
        console.error('\n[FATAL ERROR IN TEST SUITE]:', testError);
        failedCount++;
    } finally {
        // Clean up test data
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

        await mongoose.connection.close();
    }

    console.log('\n======================================================');
    console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

    if (failedCount > 0) {
        process.exit(1);
    }
}

runServicesTestSuite();
