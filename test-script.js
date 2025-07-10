// BuildDesk Comprehensive Testing Script
// This script will test every aspect of the BuildDesk application

const TEST_CONFIG = {
  baseUrl: 'http://localhost:8080',
  testUser: {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'test-password'
  },
  testTimeout: 30000
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  issues: [],
  sections: {}
};

// Helper function to log test results
function logTest(section, test, status, details = '') {
  const result = {
    section,
    test,
    status,
    details,
    timestamp: new Date().toISOString()
  };
  
  if (status === 'PASS') {
    testResults.passed++;
  } else if (status === 'FAIL') {
    testResults.failed++;
    testResults.issues.push(result);
  }
  
  if (!testResults.sections[section]) {
    testResults.sections[section] = { passed: 0, failed: 0, total: 0 };
  }
  testResults.sections[section].total++;
  testResults.sections[section][status === 'PASS' ? 'passed' : 'failed']++;
  
  console.log(`[${status}] ${section} - ${test}: ${details}`);
}

// Test Suite Functions
async function testAuthentication() {
  console.log('🔐 Starting Authentication Tests...');
  
  // Test 1: Landing page loads
  try {
    await page.goto(TEST_CONFIG.baseUrl);
    await page.waitForSelector('body', { timeout: TEST_CONFIG.testTimeout });
    logTest('Authentication', 'Landing page loads', 'PASS', 'Page loaded successfully');
  } catch (error) {
    logTest('Authentication', 'Landing page loads', 'FAIL', `Error: ${error.message}`);
  }
  
  // Test 2: Navigate to login
  try {
    await page.goto(`${TEST_CONFIG.baseUrl}/auth`);
    await page.waitForSelector('input[type="email"]', { timeout: TEST_CONFIG.testTimeout });
    logTest('Authentication', 'Login page accessible', 'PASS', 'Login form visible');
  } catch (error) {
    logTest('Authentication', 'Login page accessible', 'FAIL', `Error: ${error.message}`);
  }
  
  // Test 3: Login with valid credentials
  try {
    await page.type('input[type="email"]', TEST_CONFIG.testUser.email);
    await page.type('input[type="password"]', TEST_CONFIG.testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: TEST_CONFIG.testTimeout });
    logTest('Authentication', 'Login with valid credentials', 'PASS', 'Successfully logged in');
  } catch (error) {
    logTest('Authentication', 'Login with valid credentials', 'FAIL', `Error: ${error.message}`);
  }
}

async function testDashboard() {
  console.log('📊 Starting Dashboard Tests...');
  
  // Test 1: Dashboard loads after login
  try {
    await page.waitForSelector('[data-testid="dashboard"], .dashboard, h1', { timeout: TEST_CONFIG.testTimeout });
    logTest('Dashboard', 'Dashboard loads after login', 'PASS', 'Dashboard content visible');
  } catch (error) {
    logTest('Dashboard', 'Dashboard loads after login', 'FAIL', `Error: ${error.message}`);
  }
  
  // Test 2: Navigation menu is present
  try {
    await page.waitForSelector('nav, [role="navigation"], .sidebar', { timeout: 5000 });
    logTest('Dashboard', 'Navigation menu present', 'PASS', 'Navigation menu found');
  } catch (error) {
    logTest('Dashboard', 'Navigation menu present', 'FAIL', `Error: ${error.message}`);
  }
  
  // Test 3: Key dashboard elements
  const dashboardElements = [
    { selector: 'h1, h2, .dashboard-title', name: 'Dashboard title' },
    { selector: '.card, [data-testid="card"]', name: 'Dashboard cards' },
    { selector: 'button, [role="button"]', name: 'Interactive buttons' }
  ];
  
  for (const element of dashboardElements) {
    try {
      await page.waitForSelector(element.selector, { timeout: 5000 });
      logTest('Dashboard', element.name, 'PASS', `Element found: ${element.selector}`);
    } catch (error) {
      logTest('Dashboard', element.name, 'FAIL', `Element not found: ${element.selector}`);
    }
  }
}

async function testNavigation() {
  console.log('🧭 Starting Navigation Tests...');
  
  const navigationItems = [
    { text: 'Dashboard', url: '/dashboard' },
    { text: 'Projects', url: '/projects' },
    { text: 'Financial', url: '/financial' },
    { text: 'Time Tracking', url: '/time-tracking' },
    { text: 'Documents', url: '/documents' },
    { text: 'Settings', url: '/settings' }
  ];
  
  for (const item of navigationItems) {
    try {
      // Try to find and click navigation item
      const navElement = await page.$(`a[href="${item.url}"], button:contains("${item.text}"), [data-testid="${item.text.toLowerCase()}"]`);
      if (navElement) {
        await navElement.click();
        await page.waitForTimeout(2000); // Wait for navigation
        logTest('Navigation', `Navigate to ${item.text}`, 'PASS', `Successfully navigated to ${item.text}`);
      } else {
        logTest('Navigation', `Navigate to ${item.text}`, 'FAIL', `Navigation item not found: ${item.text}`);
      }
    } catch (error) {
      logTest('Navigation', `Navigate to ${item.text}`, 'FAIL', `Error: ${error.message}`);
    }
  }
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting BuildDesk Comprehensive Testing...');
  
  // Initialize browser if using Puppeteer
  if (typeof page === 'undefined') {
    console.log('⚠️  Puppeteer not available. Tests will be adapted for manual execution.');
    return;
  }
  
  try {
    await testAuthentication();
    await testDashboard();
    await testNavigation();
    
    // Print final results
    console.log('\n📋 Test Results Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.passed + testResults.failed}`);
    
    if (testResults.issues.length > 0) {
      console.log('\n🐛 Issues Found:');
      testResults.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.section}] ${issue.test}: ${issue.details}`);
      });
    }
    
    return testResults;
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    return null;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests, TEST_CONFIG, testResults };
}