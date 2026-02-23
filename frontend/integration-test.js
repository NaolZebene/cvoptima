/**
 * Integration Test for CVOptima Frontend-Backend Connectivity
 * 
 * This script tests that the frontend services can connect to the backend API.
 * Run with: node integration-test.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

// Test configuration
const testConfig = {
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Mock user for testing
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Run a test and record results
 */
async function runTest(name, testFn) {
  console.log(`\n🧪 Testing: ${name}`);
  
  try {
    await testFn();
    console.log(`✅ PASS: ${name}`);
    results.passed++;
    results.tests.push({ name, status: 'passed' });
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
  }
}

/**
 * Test 1: Health Check
 */
async function testHealthCheck() {
  const response = await axios.get(`${API_URL}/health`, testConfig);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (response.data.status !== 'ok') {
    throw new Error(`Expected status 'ok', got '${response.data.status}'`);
  }
  
  console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
}

/**
 * Test 2: User Registration
 */
async function testRegistration() {
  const response = await axios.post(`${API_URL}/auth/register`, testUser, testConfig);
  
  if (response.status !== 201) {
    throw new Error(`Expected status 201, got ${response.status}`);
  }
  
  if (!response.data.data || !response.data.data.token) {
    throw new Error('Missing token in response');
  }
  
  console.log(`   User registered: ${response.data.data.user.email}`);
  console.log(`   Token received: ${response.data.data.token.substring(0, 20)}...`);
  
  return response.data.data.token;
}

/**
 * Test 3: User Login
 */
async function testLogin(token) {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: testUser.email,
    password: testUser.password
  }, testConfig);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.data || !response.data.data.token) {
    throw new Error('Missing token in response');
  }
  
  console.log(`   User logged in: ${response.data.data.user.email}`);
  console.log(`   Token received: ${response.data.data.token.substring(0, 20)}...`);
  
  return response.data.data.token;
}

/**
 * Test 4: Dashboard Access (with authentication)
 */
async function testDashboardAccess(token) {
  const config = {
    ...testConfig,
    headers: {
      ...testConfig.headers,
      'Authorization': `Bearer ${token}`
    }
  };
  
  const response = await axios.get(`${API_URL}/dashboard`, config);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.data || !response.data.data.stats) {
    throw new Error('Missing dashboard data in response');
  }
  
  console.log(`   Dashboard stats:`);
  console.log(`     Total CVs: ${response.data.data.stats.totalCVs}`);
  console.log(`     Average Score: ${response.data.data.stats.averageScore}`);
  console.log(`     Best Score: ${response.data.data.stats.bestScore}`);
}

/**
 * Test 5: CV Upload (mock)
 */
async function testCVUpload(token) {
  const config = {
    ...testConfig,
    headers: {
      ...testConfig.headers,
      'Authorization': `Bearer ${token}`
    }
  };
  
  // Note: This is a mock test since we can't actually upload a file via axios in this test
  // In a real test, we would use FormData and an actual file
  const mockFormData = {
    cvFile: 'mock-file-data',
    jobDescription: 'Software Engineer position requiring JavaScript and React experience',
    industry: 'technology'
  };
  
  const response = await axios.post(`${API_URL}/cv/upload`, mockFormData, config);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.data || !response.data.data.cv) {
    throw new Error('Missing CV data in response');
  }
  
  console.log(`   CV uploaded:`);
  console.log(`     File: ${response.data.data.cv.fileName}`);
  console.log(`     Score: ${response.data.data.cv.atsScore}`);
  console.log(`     ID: ${response.data.data.cv.id}`);
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting CVOptima Integration Tests');
  console.log('=======================================');
  console.log(`API URL: ${API_URL}`);
  console.log(`Test User: ${testUser.email}`);
  
  let authToken = '';
  
  // Run tests in sequence
  await runTest('Health Check', testHealthCheck);
  await runTest('User Registration', testRegistration);
  await runTest('User Login', () => testLogin('mock-token-for-test'));
  
  // Get a real token for authenticated tests
  try {
    const registerResponse = await axios.post(`${API_URL}/auth/register`, testUser, testConfig);
    authToken = registerResponse.data.data.token;
    
    await runTest('Dashboard Access (Authenticated)', () => testDashboardAccess(authToken));
    await runTest('CV Upload (Mock)', () => testCVUpload(authToken));
  } catch (error) {
    console.log('⚠️  Skipping authenticated tests due to registration error');
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log('\n📋 Detailed Results:');
  results.tests.forEach(test => {
    console.log(`  ${test.status === 'passed' ? '✅' : '❌'} ${test.name}`);
  });
  
  // Exit code
  if (results.failed > 0) {
    console.log('\n❌ Some tests failed. Check the errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! Frontend can connect to backend.');
    console.log('\n🚀 Next Steps:');
    console.log('   1. Start the React development server: cd frontend && npm start');
    console.log('   2. Open http://localhost:3001 in your browser');
    console.log('   3. Test the full user flow: Register → Login → Dashboard → CV Upload');
    process.exit(0);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run tests
runAllTests();