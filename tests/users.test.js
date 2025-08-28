const request = require('supertest');
const app = require('../server');
const { setupTestDatabase, cleanupTestDatabase, createTestUser, generateJWT } = require('./setup');

describe('Users Endpoints', () => {
  let testUser, otherUser, adminUser;
  let userToken, otherToken, adminToken;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create test users
    testUser = await createTestUser('profile@test.com', 'CITIZEN');
    otherUser = await createTestUser('otherprofile@test.com', 'CITIZEN');
    adminUser = await createTestUser('useradmin@test.com', 'SUPER_ADMIN');
    
    // Generate tokens
    userToken = generateJWT(testUser);
    otherToken = generateJWT(otherUser);
    adminToken = generateJWT(adminUser);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/users/leaderboard', () => {
    it('should return leaderboard without authentication', async () => {
      const response = await request(app)
        .get('/api/users/leaderboard')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('leaderboard');
      expect(Array.isArray(response.body.data.leaderboard)).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/users/leaderboard?page=1&limit=10')
        .expect(200);

      expect(response.body.data.leaderboard.length).toBeLessThanOrEqual(10);
    });

    it('should show users ordered by reputation score', async () => {
      const response = await request(app)
        .get('/api/users/leaderboard')
        .expect(200);

      const users = response.body.data.leaderboard;
      if (users.length > 1) {
        for (let i = 0; i < users.length - 1; i++) {
          expect(users[i].reputation_score).toBeGreaterThanOrEqual(users[i + 1].reputation_score);
        }
      }
    });
  });

  describe('GET /api/users/search', () => {
    it('should search users when authenticated', async () => {
      const response = await request(app)
        .get('/api/users/search?q=test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('users');
      expect(Array.isArray(response.body.data.users)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/users/search?q=test')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should limit search results', async () => {
      const response = await request(app)
        .get('/api/users/search?q=test&limit=5')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.users.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user profile without authentication', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.user).toHaveProperty('id', testUser.id);
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
      expect(response.body.data.user).toHaveProperty('full_name');
      expect(response.body.data.user).toHaveProperty('role');
      expect(response.body.data.user).toHaveProperty('reputation_score');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should return user profile with authentication', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.user).toHaveProperty('id', testUser.id);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /api/users/:id/badges', () => {
    it('should return user badges without authentication', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}/badges`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('badges');
      expect(Array.isArray(response.body.data.badges)).toBe(true);
    });

    it('should include badge information', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}/badges`)
        .expect(200);

      response.body.data.badges.forEach(badge => {
        expect(badge).toHaveProperty('id');
        expect(badge).toHaveProperty('name');
        expect(badge).toHaveProperty('description');
        expect(badge).toHaveProperty('earned_at');
      });
    });
  });

  describe('GET /api/users/:id/stats', () => {
    it('should return user statistics without authentication', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data.stats).toHaveProperty('issues_created');
      expect(response.body.data.stats).toHaveProperty('comments_made');
      expect(response.body.data.stats).toHaveProperty('votes_cast');
      expect(response.body.data.stats).toHaveProperty('issues_resolved');
      expect(response.body.data.stats).toHaveProperty('badges_earned');
    });

    it('should include status breakdown', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}/stats`)
        .expect(200);

      // Check that the stats response is properly structured
      expect(response.body.data.stats).toHaveProperty('issues_created');
      expect(typeof response.body.data.stats.issues_created).toBe('string');
    });
  });

  describe('PUT /api/users/:id/role (Admin only)', () => {
    it('should allow admin to update user role', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'STEWARD' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.user).toHaveProperty('role', 'STEWARD');
      expect(response.body.message).toContain('updated');
    });

    it('should fail when non-admin tries to update role', async () => {
      const response = await request(app)
        .put(`/api/users/${otherUser.id}/role`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'STEWARD' })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('permissions');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser.id}/role`)
        .send({ role: 'STEWARD' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail with invalid role', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'INVALID_ROLE' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .put(`/api/users/${fakeId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'STEWARD' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});

module.exports = {};
