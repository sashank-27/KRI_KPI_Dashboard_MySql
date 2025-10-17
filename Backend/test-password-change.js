#!/usr/bin/env node

/**
 * Test script for password change functionality
 * This script tests the new password change endpoint
 */

const https = require('https');
const http = require('http');

// Test configuration
const API_BASE = 'http://localhost:5000';
const TEST_CREDENTIALS = {
  email: 'tyrone@netwebindia.com',
  password: 'Tyrone!@123'
};

async function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testPasswordChange() {
  try {
    console.log('🧪 Testing Password Change Functionality');
    console.log('=====================================\n');

    // Step 1: Login to get token
    console.log('1. 🔐 Logging in...');
    const loginResponse = await makeRequest('POST', '/api/login', TEST_CREDENTIALS);
    
    if (loginResponse.status !== 200) {
      console.log('❌ Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Step 2: Test password change with invalid current password
    console.log('2. 🔍 Testing with wrong current password...');
    const wrongPasswordResponse = await makeRequest('PUT', '/api/me/change-password', {
      currentPassword: 'wrongpassword',
      newPassword: 'NewPassword123!'
    }, token);
    
    if (wrongPasswordResponse.status === 400) {
      console.log('✅ Correctly rejected wrong current password:', wrongPasswordResponse.data.error);
    } else {
      console.log('❌ Should have rejected wrong current password');
    }
    console.log('');

    // Step 3: Test password change with weak new password
    console.log('3. 🔍 Testing with weak new password...');
    const weakPasswordResponse = await makeRequest('PUT', '/api/me/change-password', {
      currentPassword: TEST_CREDENTIALS.password,
      newPassword: '123'
    }, token);
    
    if (weakPasswordResponse.status === 400) {
      console.log('✅ Correctly rejected weak password:', weakPasswordResponse.data.error);
    } else {
      console.log('❌ Should have rejected weak password');
    }
    console.log('');

    // Step 4: Test password change with same password
    console.log('4. 🔍 Testing with same password...');
    const samePasswordResponse = await makeRequest('PUT', '/api/me/change-password', {
      currentPassword: TEST_CREDENTIALS.password,
      newPassword: TEST_CREDENTIALS.password
    }, token);
    
    if (samePasswordResponse.status === 400) {
      console.log('✅ Correctly rejected same password:', samePasswordResponse.data.error);
    } else {
      console.log('❌ Should have rejected same password');
    }
    console.log('');

    // Step 5: Test successful password change
    console.log('5. ✅ Testing successful password change...');
    const newPassword = 'TempPassword123!';
    const changePasswordResponse = await makeRequest('PUT', '/api/me/change-password', {
      currentPassword: TEST_CREDENTIALS.password,
      newPassword: newPassword
    }, token);
    
    if (changePasswordResponse.status === 200) {
      console.log('✅ Password changed successfully:', changePasswordResponse.data.message);
    } else {
      console.log('❌ Password change failed:', changePasswordResponse.data);
      return;
    }
    console.log('');

    // Step 6: Test login with new password
    console.log('6. 🔐 Testing login with new password...');
    const newLoginResponse = await makeRequest('POST', '/api/login', {
      email: TEST_CREDENTIALS.email,
      password: newPassword
    });
    
    if (newLoginResponse.status === 200) {
      console.log('✅ Login with new password successful');
      const newToken = newLoginResponse.data.token;
      
      // Step 7: Change password back to original
      console.log('7. 🔄 Changing password back to original...');
      const restorePasswordResponse = await makeRequest('PUT', '/api/me/change-password', {
        currentPassword: newPassword,
        newPassword: TEST_CREDENTIALS.password
      }, newToken);
      
      if (restorePasswordResponse.status === 200) {
        console.log('✅ Password restored successfully');
      } else {
        console.log('❌ Failed to restore password:', restorePasswordResponse.data);
      }
    } else {
      console.log('❌ Login with new password failed:', newLoginResponse.data);
    }
    console.log('');

    console.log('🎉 Password change functionality test completed!');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testPasswordChange();
}

module.exports = { testPasswordChange };