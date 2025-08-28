const request = require('supertest');
const app = require('../server');
const { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestIssue, generateJWT } = require('./setup');

describe('Comments Endpoints', () => {
  let testUser, otherUser;
  let userToken, otherToken;
  let testIssue, testComment;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create test users
    testUser = await createTestUser('commenter@test.com', 'CITIZEN');
    otherUser = await createTestUser('other@test.com', 'CITIZEN');
    
    // Generate tokens
    userToken = generateJWT(testUser);
    otherToken = generateJWT(otherUser);
    
    // Create test issue
    testIssue = await createTestIssue(testUser.id);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/comments/issues/:issueId/comments', () => {
    it('should return comments for an issue', async () => {
      const response = await request(app)
        .get(`/api/comments/issues/${testIssue.id}/comments`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('comments');
      expect(Array.isArray(response.body.data.comments)).toBe(true);
    });

    it('should work without authentication', async () => {
      const response = await request(app)
        .get(`/api/comments/issues/${testIssue.id}/comments`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('POST /api/comments/issues/:issueId/comments', () => {
    const validCommentData = {
      content: 'This is a test comment with sufficient length for validation.'
    };

    it('should create comment when authenticated', async () => {
      const response = await request(app)
        .post(`/api/comments/issues/${testIssue.id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(validCommentData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.comment).toHaveProperty('content', validCommentData.content);
      expect(response.body.data.comment).toHaveProperty('user_id', testUser.id);
      expect(response.body.data.comment).toHaveProperty('issue_id', testIssue.id);
      
      // Store for later tests
      testComment = response.body.data.comment;
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/comments/issues/${testIssue.id}/comments`)
        .send(validCommentData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail with empty content', async () => {
      const response = await request(app)
        .post(`/api/comments/issues/${testIssue.id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: '' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should fail with content too long', async () => {
      const longContent = 'x'.repeat(1001); // Exceeds 1000 char limit
      
      const response = await request(app)
        .post(`/api/comments/issues/${testIssue.id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: longContent })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail for non-existent issue', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .post(`/api/comments/issues/${fakeId}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(validCommentData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/comments/:commentId', () => {
    it('should return comment details', async () => {
      const response = await request(app)
        .get(`/api/comments/${testComment.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.comment).toHaveProperty('id', testComment.id);
      expect(response.body.data.comment).toHaveProperty('content', testComment.content);
    });

    it('should return 404 for non-existent comment', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/comments/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/comments/:commentId', () => {
    const updatedContent = 'This is an updated test comment with sufficient length.';

    it('should allow user to update their own comment', async () => {
      const response = await request(app)
        .put(`/api/comments/${testComment.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: updatedContent })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.comment).toHaveProperty('content', updatedContent);
    });

    it('should fail when user tries to update others comment', async () => {
      const response = await request(app)
        .put(`/api/comments/${testComment.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ content: updatedContent })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/comments/${testComment.id}`)
        .send({ content: updatedContent })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/comments/:commentId/flag', () => {
    it('should allow user to flag a comment', async () => {
      const response = await request(app)
        .post(`/api/comments/${testComment.id}/flag`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ reason: 'Inappropriate content' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('flagged');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/comments/${testComment.id}/flag`)
        .send({ reason: 'Inappropriate content' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/comments/users/:userId/comments', () => {
    it('should return user comments', async () => {
      const response = await request(app)
        .get(`/api/comments/users/${testUser.id}/comments`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('comments');
      expect(Array.isArray(response.body.data.comments)).toBe(true);
    });

    it('should work without authentication', async () => {
      const response = await request(app)
        .get(`/api/comments/users/${testUser.id}/comments`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('DELETE /api/comments/:commentId', () => {
    let deleteTestComment;

    beforeEach(async () => {
      // Create a fresh comment for deletion test
      const response = await request(app)
        .post(`/api/comments/issues/${testIssue.id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Comment to be deleted for testing purposes.' });
      
      deleteTestComment = response.body.data.comment;
    });

    it('should allow user to delete their own comment', async () => {
      const response = await request(app)
        .delete(`/api/comments/${deleteTestComment.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('deleted');
    });

    it('should fail when user tries to delete others comment', async () => {
      const response = await request(app)
        .delete(`/api/comments/${deleteTestComment.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .delete(`/api/comments/${deleteTestComment.id}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});

module.exports = {};
