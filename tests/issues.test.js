const request = require('supertest');
const app = require('../server');
const { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestIssue, generateJWT } = require('./setup');

describe('Issues Endpoints', () => {
  let testUser, stewardUser, adminUser;
  let userToken, stewardToken, adminToken;
  let testIssue;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create test users
    testUser = await createTestUser('user@test.com', 'CITIZEN');
    stewardUser = await createTestUser('steward@test.com', 'STEWARD');
    adminUser = await createTestUser('admin@test.com', 'SUPER_ADMIN');
    
    // Generate tokens
    userToken = generateJWT(testUser);
    stewardToken = generateJWT(stewardUser);
    adminToken = generateJWT(adminUser);
    
    // Create test issue
    testIssue = await createTestIssue(testUser.id);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/issues', () => {
    it('should return paginated issues list', async () => {
      const response = await request(app)
        .get('/api/issues')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter issues by status', async () => {
      const response = await request(app)
        .get('/api/issues?status=OPEN')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      response.body.data.forEach(issue => {
        expect(issue.status).toBe('OPEN');
      });
    });

    it('should filter issues by category', async () => {
      const response = await request(app)
        .get('/api/issues?categoryId=1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      response.body.data.forEach(issue => {
        expect(issue.category_id).toBe(1);
      });
    });

    it('should search issues by title/description', async () => {
      const response = await request(app)
        .get('/api/issues?search=road')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/issues?page=1&limit=5')
        .expect(200);

      expect(response.body.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.pagination).toHaveProperty('pageSize', 5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/issues/categories', () => {
    it('should return all issue categories', async () => {
      const response = await request(app)
        .get('/api/issues/categories')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
      expect(response.body.data.categories.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/issues/:id', () => {
    it('should return issue details', async () => {
      const response = await request(app)
        .get(`/api/issues/${testIssue.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.issue).toHaveProperty('id', testIssue.id);
      expect(response.body.data.issue).toHaveProperty('title');
      expect(response.body.data.issue).toHaveProperty('description');
      expect(response.body.data.issue).toHaveProperty('location_lat');
      expect(response.body.data.issue).toHaveProperty('location_lng');
    });

    it('should return 404 for non-existent issue', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/issues/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/issues', () => {
    const validIssueData = {
      title: 'TEST: New Issue',
      description: 'This is a test issue with proper description length.',
      categoryId: 1,
      locationLat: 12.9716,
      locationLng: 77.5946,
      address: 'Test Address, Bangalore'
    };

    it('should create issue when authenticated', async () => {
      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validIssueData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.issue).toHaveProperty('title', validIssueData.title);
      expect(response.body.data.issue).toHaveProperty('status', 'OPEN');
      expect(response.body.data.issue).toHaveProperty('user_id', testUser.id);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/issues')
        .send(validIssueData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail with invalid data', async () => {
      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'x', // Too short
          description: 'short', // Too short
          categoryId: 'invalid',
          locationLat: 'invalid',
          locationLng: 'invalid'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/issues/:issueId/vote', () => {
    it('should allow upvoting an issue', async () => {
      const response = await request(app)
        .post(`/api/issues/${testIssue.id}/vote`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ voteType: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('voteScore');
    });

    it('should allow downvoting an issue', async () => {
      const response = await request(app)
        .post(`/api/issues/${testIssue.id}/vote`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ voteType: -1 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('voteScore');
    });

    it('should fail with invalid vote type', async () => {
      const response = await request(app)
        .post(`/api/issues/${testIssue.id}/vote`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ voteType: 2 })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/issues/:id/status (Steward/Admin only)', () => {
    it('should allow steward to update issue status', async () => {
      const response = await request(app)
        .put(`/api/issues/${testIssue.id}/status`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({
          status: 'ACKNOWLEDGED',
          reason: 'Issue has been reviewed'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.issue).toHaveProperty('status', 'ACKNOWLEDGED');
    });

    it('should fail when regular user tries to update status', async () => {
      const response = await request(app)
        .put(`/api/issues/${testIssue.id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: 'RESOLVED',
          reason: 'Fixed'
        })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/issues/:id', () => {
    let userIssue;

    beforeAll(async () => {
      userIssue = await createTestIssue(testUser.id);
    });

    it('should allow user to delete their own issue', async () => {
      const response = await request(app)
        .delete(`/api/issues/${userIssue.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('deleted');
    });

    it('should fail when user tries to delete others issue', async () => {
      const otherUserIssue = await createTestIssue(stewardUser.id);
      
      const response = await request(app)
        .delete(`/api/issues/${otherUserIssue.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});

module.exports = {};
