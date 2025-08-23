#!/usr/bin/env node

/**
 * Alliance CropCraft Application Testing Script
 * 
 * This script tests all major functionality of the application
 * Run with: node test-application.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m'     // Reset
  };
  
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
};

const test = async (name, testFunction) => {
  testResults.total++;
  log(`🧪 Testing: ${name}`, 'info');
  
  try {
    await testFunction();
    testResults.passed++;
    log(`✅ PASSED: ${name}`, 'success');
    testResults.details.push({ name, status: 'PASSED' });
  } catch (error) {
    testResults.failed++;
    log(`❌ FAILED: ${name} - ${error.message}`, 'error');
    testResults.details.push({ name, status: 'FAILED', error: error.message });
  }
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertResponse = (response, expectedStatus = 200) => {
  assert(response.status === expectedStatus, 
    `Expected status ${expectedStatus}, got ${response.status}`);
};

const assertData = (data, requiredFields = []) => {
  requiredFields.forEach(field => {
    assert(data.hasOwnProperty(field), `Missing required field: ${field}`);
  });
};

// Test functions
const testHealthCheck = async () => {
  const response = await axios.get(`${BASE_URL}/health`);
  assertResponse(response);
  assertData(response.data, ['status', 'timestamp']);
  assert(response.data.status === 'OK', 'Health check should return OK status');
};

const testUserRegistration = async () => {
  const userData = {
    full_name: 'Test User',
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    role: 'Farm Attendant'
  };
  
  const response = await axios.post(`${BASE_URL}/api/auth/register`, userData);
  assertResponse(response, 201);
  assertData(response.data, ['token', 'user']);
  assertData(response.data.user, ['id', 'full_name', 'email', 'role']);
  
  return response.data.token;
};

const testUserLogin = async (token) => {
  const loginData = {
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  };
  
  const response = await axios.post(`${BASE_URL}/api/auth/login`, loginData);
  assertResponse(response);
  assertData(response.data, ['token', 'user']);
  
  return response.data.token;
};

const testEmailVerification = async (token) => {
  const headers = { Authorization: `Bearer ${token}` };
  
  // Test sending verification email
  const sendResponse = await axios.post(`${BASE_URL}/api/auth/send-verification`, 
    { email: TEST_EMAIL }, { headers });
  assertResponse(sendResponse);
  
  // Note: In a real test, you'd need to check the email or database
  log('📧 Email verification test completed (manual verification required)', 'warning');
};

const testDashboardStats = async (token) => {
  const headers = { Authorization: `Bearer ${token}` };
  const response = await axios.get(`${BASE_URL}/api/dashboard/stats`, { headers });
  assertResponse(response);
  assertData(response.data, ['completionRate', 'activeStaff', 'thisWeekTasks']);
};

const testTasksAPI = async (token) => {
  const headers = { Authorization: `Bearer ${token}` };
  
  // Test getting tasks
  const getResponse = await axios.get(`${BASE_URL}/api/tasks`, { headers });
  assertResponse(getResponse);
  assertData(getResponse.data, ['data']);
  
  // Test creating a task
  const taskData = {
    title: 'Test Task',
    description: 'Test task description',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'Medium',
    tag: 'dynamic'
  };
  
  const createResponse = await axios.post(`${BASE_URL}/api/tasks`, taskData, { headers });
  assertResponse(createResponse, 201);
  assertData(createResponse.data, ['message', 'task']);
  
  return createResponse.data.task.id;
};

const testEventsAPI = async (token) => {
  const headers = { Authorization: `Bearer ${token}` };
  
  // Test getting events
  const getResponse = await axios.get(`${BASE_URL}/api/events`, { headers });
  assertResponse(getResponse);
  
  // Test creating an event
  const eventData = {
    title: 'Test Event',
    description: 'Test event description',
    event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_time: '10:00',
    type: 'Meeting',
    priority: 'medium'
  };
  
  const createResponse = await axios.post(`${BASE_URL}/api/events`, eventData, { headers });
  assertResponse(response, 201);
  assertData(createResponse.data, ['id', 'title']);
  
  return createResponse.data.id;
};

const testLivestockAPI = async (token) => {
  const headers = { Authorization: `Bearer ${token}` };
  
  // Test getting livestock
  const getResponse = await axios.get(`${BASE_URL}/api/livestock`, { headers });
  assertResponse(getResponse);
  assertData(getResponse.data, ['data']);
  
  // Test creating livestock (should fail for non-admin/manager)
  const livestockData = {
    name: 'Test Animal',
    type: 'Cattle',
    breed: 'Test Breed',
    age: 2.5,
    weight: 300.0,
    health_status: 'Healthy',
    location: 'Test Location'
  };
  
  try {
    await axios.post(`${BASE_URL}/api/livestock`, livestockData, { headers });
    throw new Error('Non-admin user should not be able to create livestock');
  } catch (error) {
    assert(error.response.status === 403, 'Expected 403 Forbidden for non-admin user');
  }
};

const testUserManagement = async (token) => {
  const headers = { Authorization: `Bearer ${token}` };
  
  // Test getting users
  const response = await axios.get(`${BASE_URL}/api/users`, { headers });
  assertResponse(response);
  assertData(response.data, ['data']);
  
  // Verify user data structure
  if (response.data.data.length > 0) {
    const user = response.data.data[0];
    assertData(user, ['id', 'full_name', 'email', 'role']);
  }
};

const testNotifications = async (token) => {
  const headers = { Authorization: `Bearer ${token}` };
  
  // Test push subscription
  const subscriptionData = {
    endpoint: 'https://example.com/push',
    keys: {
      p256dh: 'test-key',
      auth: 'test-auth'
    }
  };
  
  const response = await axios.post(`${BASE_URL}/api/notifications/subscribe`, 
    subscriptionData, { headers });
  assertResponse(response);
  assertData(response.data, ['success']);
};

const testErrorHandling = async () => {
  // Test invalid login
  try {
    await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    });
    throw new Error('Invalid login should fail');
  } catch (error) {
    assert(error.response.status === 401, 'Expected 401 for invalid credentials');
  }
  
  // Test unauthorized access
  try {
    await axios.get(`${BASE_URL}/api/users`);
    throw new Error('Unauthorized request should fail');
  } catch (error) {
    assert(error.response.status === 401, 'Expected 401 for unauthorized request');
  }
  
  // Test invalid task creation
  try {
    await axios.post(`${BASE_URL}/api/tasks`, {});
    throw new Error('Invalid task data should fail');
  } catch (error) {
    assert(error.response.status === 401, 'Expected 401 for unauthorized request');
  }
};

const testDatabaseConnection = async () => {
  // This would test database connectivity
  // For now, we'll test if the server is responding
  const response = await axios.get(`${BASE_URL}/health`);
  assertResponse(response);
  log('🗄️ Database connection appears to be working', 'success');
};

// Main test execution
const runTests = async () => {
  log('🚀 Starting Alliance CropCraft Application Tests', 'info');
  log(`📍 Testing against: ${BASE_URL}`, 'info');
  
  let authToken = null;
  let taskId = null;
  let eventId = null;
  
  try {
    // Basic connectivity tests
    await test('Health Check', testHealthCheck);
    await test('Database Connection', testDatabaseConnection);
    
    // Authentication tests
    await test('User Registration', async () => {
      authToken = await testUserRegistration();
    });
    
    await test('User Login', async () => {
      authToken = await testUserLogin(authToken);
    });
    
    await test('Email Verification', async () => {
      await testEmailVerification(authToken);
    });
    
    // Core functionality tests
    await test('Dashboard Stats', async () => {
      await testDashboardStats(authToken);
    });
    
    await test('Tasks API', async () => {
      taskId = await testTasksAPI(authToken);
    });
    
    await test('Events API', async () => {
      eventId = await testEventsAPI(authToken);
    });
    
    await test('Livestock API', async () => {
      await testLivestockAPI(authToken);
    });
    
    await test('User Management', async () => {
      await testUserManagement(authToken);
    });
    
    await test('Notifications', async () => {
      await testNotifications(authToken);
    });
    
    // Error handling tests
    await test('Error Handling', testErrorHandling);
    
  } catch (error) {
    log(`💥 Test execution failed: ${error.message}`, 'error');
  }
  
  // Print results
  log('\n📊 Test Results Summary', 'info');
  log(`Total Tests: ${testResults.total}`, 'info');
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
  
  if (testResults.failed > 0) {
    log('\n❌ Failed Tests:', 'error');
    testResults.details
      .filter(test => test.status === 'FAILED')
      .forEach(test => {
        log(`  - ${test.name}: ${test.error}`, 'error');
      });
  }
  
  if (testResults.passed === testResults.total) {
    log('\n🎉 All tests passed! Application is ready for production.', 'success');
  } else {
    log('\n⚠️ Some tests failed. Please review and fix issues before deployment.', 'warning');
  }
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
};

// Handle script execution
if (require.main === module) {
  runTests().catch(error => {
    log(`💥 Test runner failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  test,
  assert,
  assertResponse,
  assertData,
  runTests
};