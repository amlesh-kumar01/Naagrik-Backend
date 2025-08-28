#!/usr/bin/env node

/**
 * Manual API Test for Refresh Token Implementation
 * This script tests the complete refresh token flow
 */

const request = require('supertest');
const app = require('../server');

const TEST_USER = {
  email: 'refresh-test@example.com',
  password: 'Password123',
  fullName: 'Refresh Test User'
};

async function testRefreshTokenFlow() {
  console.log('🧪 Testing Refresh Token Implementation\n');
  
  try {
    // Step 1: Register a test user
    console.log('1. Registering test user...');
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(TEST_USER)
      .expect(201);
    
    console.log('✅ User registered successfully');
    console.log(`   - User ID: ${registerResponse.body.data.user.id}`);
    console.log(`   - Has refresh token: ${!!registerResponse.body.data.refreshToken}`);
    
    const { token: initialToken, refreshToken: initialRefreshToken } = registerResponse.body.data;
    
    // Step 2: Test initial token
    console.log('\n2. Testing initial access token...');
    const profileResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${initialToken}`)
      .expect(200);
    
    console.log('✅ Initial token works correctly');
    console.log(`   - User: ${profileResponse.body.data.user.fullName}`);
    
    // Step 3: Test refresh token
    console.log('\n3. Testing refresh token...');
    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: initialRefreshToken })
      .expect(200);
    
    console.log('✅ Refresh token works correctly');
    console.log(`   - New token received: ${!!refreshResponse.body.data.token}`);
    console.log(`   - New refresh token: ${!!refreshResponse.body.data.refreshToken}`);
    console.log(`   - Token rotated: ${refreshResponse.body.data.refreshToken !== initialRefreshToken}`);
    
    const { token: newToken, refreshToken: newRefreshToken } = refreshResponse.body.data;
    
    // Step 4: Test new token
    console.log('\n4. Testing new access token...');
    const newProfileResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${newToken}`)
      .expect(200);
    
    console.log('✅ New token works correctly');
    
    // Step 5: Test old refresh token (should fail)
    console.log('\n5. Testing old refresh token (should fail)...');
    const oldRefreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: initialRefreshToken })
      .expect(401);
    
    console.log('✅ Old refresh token correctly invalidated');
    console.log(`   - Error: ${oldRefreshResponse.body.message}`);
    
    // Step 6: Test logout
    console.log('\n6. Testing logout...');
    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${newToken}`)
      .send({ refreshToken: newRefreshToken })
      .expect(200);
    
    console.log('✅ Logout successful');
    
    // Step 7: Test refresh token after logout (should fail)
    console.log('\n7. Testing refresh token after logout (should fail)...');
    const postLogoutRefreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: newRefreshToken })
      .expect(401);
    
    console.log('✅ Refresh token correctly invalidated after logout');
    console.log(`   - Error: ${postLogoutRefreshResponse.body.message}`);
    
    console.log('\n🎉 Refresh Token Flow Test Complete!');
    console.log('\n📋 Summary:');
    console.log('   ✅ User registration with refresh token');
    console.log('   ✅ Token validation and refresh');
    console.log('   ✅ Token rotation (security)');
    console.log('   ✅ Old token invalidation (security)');
    console.log('   ✅ Logout and token cleanup');
    console.log('   ✅ Post-logout token invalidation (security)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.body || error.response.text);
    }
  }
}

// Run if this script is executed directly
if (require.main === module) {
  testRefreshTokenFlow();
}

module.exports = { testRefreshTokenFlow };
