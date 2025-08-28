const { v4: uuidv4 } = require('uuid');
const request = require('supertest');

/**
 * Test utilities for authentication and refresh token testing
 */

/**
 * Create a test user and get auth tokens
 * @param {Object} app - Express app instance
 * @param {Object} userData - User data for registration
 * @returns {Object} - Auth tokens and user data
 */
async function createTestUserWithTokens(app, userData = {}) {
  const defaultUserData = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123',
    fullName: 'Test User'
  };
  
  const user = { ...defaultUserData, ...userData };
  
  // Register user
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send(user)
    .expect(201);
  
  return {
    user: registerResponse.body.data.user,
    token: registerResponse.body.data.token,
    refreshToken: registerResponse.body.data.refreshToken
  };
}

/**
 * Login user and get auth tokens
 * @param {Object} app - Express app instance
 * @param {String} email - User email
 * @param {String} password - User password
 * @returns {Object} - Auth tokens and user data
 */
async function loginTestUser(app, email, password) {
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  
  return {
    user: loginResponse.body.data.user,
    token: loginResponse.body.data.token,
    refreshToken: loginResponse.body.data.refreshToken
  };
}

/**
 * Generate a valid UUID for testing
 * @returns {String} - Valid UUID
 */
function generateTestUUID() {
  return uuidv4();
}

/**
 * Generate test refresh token data
 * @param {String} userId - User ID
 * @returns {Object} - Test refresh token data
 */
function generateTestRefreshTokenData(userId) {
  return {
    tokenId: generateTestUUID(),
    userId,
    familyId: generateTestUUID(),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    isActive: true
  };
}

module.exports = {
  createTestUserWithTokens,
  loginTestUser,
  generateTestUUID,
  generateTestRefreshTokenData
};
