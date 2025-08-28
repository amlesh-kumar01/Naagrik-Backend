const request = require('supertest');
const { setupTestDatabase, cleanupTestDatabase, createTestUser, generateJWT } = require('./setup');
const { createTestUserWithTokens, generateTestUUID } = require('./testUtils');
const MockSessionService = require('./mocks/MockSessionService');

// Create mock instance that will be used throughout the tests
const mockSessionService = new MockSessionService();

// Mock the session service before importing the app
jest.mock('../services/sessionService', () => mockSessionService);

// Import app after mocking
const app = require('../server');

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(() => {
    // Clear mock session service before each test
    mockSessionService.clear();
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'newuser@test.com',
      password: 'Password123',
      fullName: 'New Test User'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', validUserData.email);
      expect(response.body.data.user).toHaveProperty('role', 'CITIZEN');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toContainEqual(expect.objectContaining({
        field: 'email'
      }));
    });

    it('should fail with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'another@test.com',
          password: '123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toContainEqual(expect.objectContaining({
        field: 'password'
      }));
    });

    it('should fail with duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'duplicate@test.com'
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'duplicate@test.com'
        })
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeAll(async () => {
      testUser = await createTestUser('login@test.com');
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', 'login@test.com');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    let testUser;
    let token;

    beforeAll(async () => {
      testUser = await createTestUser('me@test.com');
      token = generateJWT(testUser);
    });

    it('should return user profile when authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.user).toHaveProperty('email', 'me@test.com');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('token');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let testUser;
    let refreshToken;

    beforeEach(async () => {
      // Create test user with tokens using our utility
      const authData = await createTestUserWithTokens(app, {
        email: `refresh-${Date.now()}@test.com`,
        password: 'Password123',
        fullName: 'Refresh Test User'
      });
      
      testUser = authData.user;
      refreshToken = authData.refreshToken;
      
      // Store the refresh token in our mock service
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await mockSessionService.storeRefreshToken(
        refreshToken,
        testUser.id,
        expiresAt
      );
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.refreshToken).not.toBe(refreshToken); // Should be rotated
    });

    it('should fail without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should fail with invalid refresh token', async () => {
      const invalidToken = generateTestUUID(); // Valid UUID but not stored
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: invalidToken })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toBe('Invalid or expired refresh token');
    });

    it('should fail with used refresh token', async () => {
      // First use should succeed
      const firstResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const newRefreshToken = firstResponse.body.data.refreshToken;

      // Using old refresh token should fail
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken }) // Old token
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toBe('Invalid or expired refresh token');
    });

    it('should fail with expired refresh token', async () => {
      const expiredToken = generateTestUUID();
      const expiredDate = new Date(Date.now() - 1000).toISOString(); // 1 second ago
      
      // Store expired token
      await mockSessionService.storeRefreshToken(
        expiredToken,
        testUser.id,
        expiredDate
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toBe('Invalid or expired refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    let testUser;
    let token;
    let refreshToken;

    beforeAll(async () => {
      testUser = await createTestUser('logout@test.com');
      
      // Login to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logout@test.com',
          password: 'password123'
        });
      
      token = loginResponse.body.data.token;
      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toBe('Logged out successfully');

      // Verify refresh token is invalidated
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(refreshResponse.body.message).toBe('Invalid or expired refresh token');
    });

    it('should fail logout without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'some-token' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
