const request = require('supertest');
const app = require('../server');
const { setupTestDatabase, cleanupTestDatabase, createTestUser, generateJWT } = require('./setup');

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
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
});

module.exports = {};
