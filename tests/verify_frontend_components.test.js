const fs = require('fs');
const path = require('path');

console.log('==================================================');
console.log('TRUCKSATHI FRONTEND STATIC & SEMANTIC AUDIT');
console.log('==================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`[PASS] ${message}`);
        passCount++;
    } else {
        console.error(`[FAIL] ${message}`);
        failCount++;
    }
}

const frontendSrc = path.join(__dirname, '..', '..', 'trucksathi-frontend', 'src');

// 1. Check i18n trust keys
const enJson = JSON.parse(fs.readFileSync(path.join(frontendSrc, 'i18n', 'en.json'), 'utf8'));
const hiJson = JSON.parse(fs.readFileSync(path.join(frontendSrc, 'i18n', 'hi.json'), 'utf8'));

assert(enJson.trust && enJson.trust.directCallTitle && enJson.trust.realGpsTitle, 'en.json contains top-level trust keys');
assert(hiJson.trust && hiJson.trust.directCallTitle && hiJson.trust.realGpsTitle, 'hi.json contains top-level trust keys');
assert(!enJson.trust.directCallTitle.includes('trust.'), 'en.json directCallTitle is human readable');
assert(!enJson.trust.realGpsTitle.includes('trust.'), 'en.json realGpsTitle is human readable');

// 2. Check LoginPage uses t('trust.directCallTitle')
const loginPageContent = fs.readFileSync(path.join(frontendSrc, 'pages', 'LoginPage.jsx'), 'utf8');
assert(loginPageContent.includes("t('trust.directCallTitle')"), 'LoginPage correctly references t(trust.directCallTitle)');
assert(loginPageContent.includes("t('trust.realGpsTitle')"), 'LoginPage correctly references t(trust.realGpsTitle)');

// 3. Check MechanicDashboard hero status control
const mechanicDashContent = fs.readFileSync(path.join(frontendSrc, 'pages', 'mechanic', 'MechanicDashboard.jsx'), 'utf8');
assert(mechanicDashContent.includes('isAvailable ? \'#dc2626\' : \'#16a34a\''), 'MechanicDashboard has clear Red for Go Offline and Green for Go Online');
assert(!mechanicDashContent.includes('minWidth: \'130px\''), 'MechanicDashboard removed dual button container');
assert(mechanicDashContent.includes('btn-retry'), 'MechanicDashboard uses visible btn-retry class');
assert(mechanicDashContent.includes('minHeight: \'110px\''), 'MechanicDashboard uses compact empty state (~110px)');

// 4. Check MechanicRequestsPage container and responsive grid
const requestsPageContent = fs.readFileSync(path.join(frontendSrc, 'pages', 'mechanic', 'MechanicRequestsPage.jsx'), 'utf8');
assert(requestsPageContent.includes('className="work-queue-container"'), 'MechanicRequestsPage uses work-queue-container (max-width: 1200px centered)');
assert(requestsPageContent.includes('className="work-queue-grid"'), 'MechanicRequestsPage uses work-queue-grid');
assert(requestsPageContent.includes('WorkQueueCard'), 'MechanicRequestsPage uses compact WorkQueueCard');
assert(!requestsPageContent.includes('/* Grouped view: Active Section then Past History Section */'), 'MechanicRequestsPage removed separate giant vertical sections for All filter');

// 5. Check WorkQueueCard
const workQueueCardContent = fs.readFileSync(path.join(frontendSrc, 'components', 'mechanic', 'WorkQueueCard.jsx'), 'utf8');
assert(workQueueCardContent.includes('✓ {t(\'requests.completed\')}'), 'WorkQueueCard displays ✓ COMPLETED badge');
assert(workQueueCardContent.includes('✕ {t(\'requests.cancelled\')}'), 'WorkQueueCard displays ✕ CANCELLED badge');
assert(workQueueCardContent.includes('◷ {t(\'requests.expired\')}'), 'WorkQueueCard displays ◷ EXPIRED badge');
assert(workQueueCardContent.includes('{/* 4. Historical: Completed, Cancelled, Expired - NO ACTIVE BUTTONS */}'), 'WorkQueueCard has NO active buttons for completed/historical requests');
assert(workQueueCardContent.includes('handleStartAssistance'), 'WorkQueueCard handles Start Assistance for accepted requests');
assert(workQueueCardContent.includes('handleCompleteAssistance'), 'WorkQueueCard handles Mark Assistance Completed for in_progress requests');

// 6. Check index.css for responsive grid and card styles
const indexCssContent = fs.readFileSync(path.join(frontendSrc, 'index.css'), 'utf8');
assert(indexCssContent.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'), 'index.css defines 3 columns desktop grid');
assert(indexCssContent.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'index.css defines 2 columns tablet grid');
assert(indexCssContent.includes('grid-template-columns: 1fr'), 'index.css defines 1 column mobile grid');
assert(indexCssContent.includes('.work-queue-container'), 'index.css defines .work-queue-container with max-width: 1200px');
assert(indexCssContent.includes('.btn-retry'), 'index.css defines .btn-retry with high contrast');

console.log(`\nAUDIT SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
if (failCount > 0) process.exit(1);
