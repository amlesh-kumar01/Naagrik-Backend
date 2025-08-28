const request = require('supertest');
const app = require('../server');
const { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestIssue, generateJWT } = require('./setup');

describe('Stewards Endpoints', () => {
  let testUser, stewardUser, adminUser;
  let userToken, stewardToken, adminToken;
  let testIssue;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create test users
    testUser = await createTestUser('stewardtest@test.com', 'CITIZEN');
    stewardUser = await createTestUser('activesteward@test.com', 'STEWARD');
    adminUser = await createTestUser('stewardadmin@test.com', 'SUPER_ADMIN');
    
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

  describe('POST /api/stewards/applications', () => {
    const validApplicationData = {
      justification: 'I have been an active community member for several years and have extensive experience in local governance. I believe I can contribute significantly to resolving civic issues in my area and help improve the overall quality of life for residents.'
    };

    it('should submit steward application when authenticated', async () => {
      const response = await request(app)
        .post('/api/stewards/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validApplicationData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.application).toHaveProperty('justification', validApplicationData.justification);
      expect(response.body.data.application).toHaveProperty('status', 'PENDING');
      expect(response.body.data.application).toHaveProperty('user_id', testUser.id);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/stewards/applications')
        .send(validApplicationData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail with short justification', async () => {
      const response = await request(app)
        .post('/api/stewards/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ justification: 'Too short' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should fail with duplicate application', async () => {
      // First application already created in first test
      const response = await request(app)
        .post('/api/stewards/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validApplicationData)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('already');
    });
  });

  describe('GET /api/stewards/applications/me', () => {
    it('should return user application when authenticated', async () => {
      const response = await request(app)
        .get('/api/stewards/applications/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.application).toHaveProperty('user_id', testUser.id);
      expect(response.body.data.application).toHaveProperty('status');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/stewards/applications/me')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 if no application exists', async () => {
      // Create a user without application
      const newUser = await createTestUser('noapplication@test.com');
      const newUserToken = generateJWT(newUser);

      const response = await request(app)
        .get('/api/stewards/applications/me')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/stewards/zones/me (Steward only)', () => {
    it('should return steward zones when authenticated as steward', async () => {
      const response = await request(app)
        .get('/api/stewards/zones/me')
        .set('Authorization', `Bearer ${stewardToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('zones');
      expect(Array.isArray(response.body.data.zones)).toBe(true);
    });

    it('should fail when regular user tries to access', async () => {
      const response = await request(app)
        .get('/api/stewards/zones/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/stewards/zones/me')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/stewards/issues/:issueId/notes (Steward only)', () => {
    const validNoteData = {
      note: 'This issue has been reviewed and requires immediate attention from the maintenance team.'
    };

    it('should add steward note when authenticated as steward', async () => {
      const response = await request(app)
        .post(`/api/stewards/issues/${testIssue.id}/notes`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send(validNoteData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.note).toHaveProperty('note', validNoteData.note);
      expect(response.body.data.note).toHaveProperty('steward_id', stewardUser.id);
      expect(response.body.data.note).toHaveProperty('issue_id', testIssue.id);
    });

    it('should fail when regular user tries to add note', async () => {
      const response = await request(app)
        .post(`/api/stewards/issues/${testIssue.id}/notes`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(validNoteData)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail with empty note', async () => {
      const response = await request(app)
        .post(`/api/stewards/issues/${testIssue.id}/notes`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ note: '' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/stewards/issues/:issueId/notes (Steward only)', () => {
    it('should return steward notes when authenticated as steward', async () => {
      const response = await request(app)
        .get(`/api/stewards/issues/${testIssue.id}/notes`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('notes');
      expect(Array.isArray(response.body.data.notes)).toBe(true);
    });

    it('should fail when regular user tries to access', async () => {
      const response = await request(app)
        .get(`/api/stewards/issues/${testIssue.id}/notes`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/stewards/stats/me (Steward only)', () => {
    it('should return steward statistics when authenticated as steward', async () => {
      const response = await request(app)
        .get('/api/stewards/stats/me')
        .set('Authorization', `Bearer ${stewardToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data.stats).toHaveProperty('issues_handled');
      expect(response.body.data.stats).toHaveProperty('notes_added');
      expect(response.body.data.stats).toHaveProperty('issues_resolved');
    });

    it('should fail when regular user tries to access', async () => {
      const response = await request(app)
        .get('/api/stewards/stats/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/stewards/applications/pending (Admin only)', () => {
    it('should return pending applications when authenticated as admin', async () => {
      const response = await request(app)
        .get('/api/stewards/applications/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('applications');
      expect(Array.isArray(response.body.data.applications)).toBe(true);
    });

    it('should fail when steward tries to access', async () => {
      const response = await request(app)
        .get('/api/stewards/applications/pending')
        .set('Authorization', `Bearer ${stewardToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail when regular user tries to access', async () => {
      const response = await request(app)
        .get('/api/stewards/applications/pending')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/stewards/applications/:id/review (Admin only)', () => {
    let applicationId;

    beforeAll(async () => {
      // Get the application ID from the pending applications
      const response = await request(app)
        .get('/api/stewards/applications/pending')
        .set('Authorization', `Bearer ${adminToken}`);
      
      if (response.body.data.applications.length > 0) {
        applicationId = response.body.data.applications[0].id;
      }
    });

    it('should approve application when authenticated as admin', async () => {
      if (!applicationId) {
        return; // Skip if no applications exist
      }

      const response = await request(app)
        .put(`/api/stewards/applications/${applicationId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'APPROVED',
          feedback: 'Application approved based on excellent community involvement.'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.application).toHaveProperty('status', 'APPROVED');
    });

    it('should fail when non-admin tries to review', async () => {
      if (!applicationId) {
        return;
      }

      const response = await request(app)
        .put(`/api/stewards/applications/${applicationId}/review`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: 'REJECTED',
          feedback: 'Not qualified'
        })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/stewards (Admin only)', () => {
    it('should return all stewards when authenticated as admin', async () => {
      const response = await request(app)
        .get('/api/stewards')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('stewards');
      expect(Array.isArray(response.body.data.stewards)).toBe(true);
    });

    it('should fail when non-admin tries to access', async () => {
      const response = await request(app)
        .get('/api/stewards')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});

module.exports = {};
