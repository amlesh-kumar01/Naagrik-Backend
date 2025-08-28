const request = require('supertest');
const app = require('../server');
const { setupTestDatabase, cleanupTestDatabase, createTestUser, generateJWT } = require('./setup');
const path = require('path');
const fs = require('fs');

// Create a minimal valid JPEG buffer for testing
const createTestImageBuffer = () => Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
  0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
  0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
  0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x1F,
  0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00,
  0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F,
  0x00, 0xB2, 0xC0, 0x07, 0xFF, 0xD9
]);

describe('Upload Endpoints', () => {
  let testUser;
  let userToken;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create test user
    testUser = await createTestUser('uploader@test.com', 'CITIZEN');
    
    // Generate token
    userToken = generateJWT(testUser);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/upload/profile', () => {
    it('should upload profile image when authenticated', async () => {
      const testImageBuffer = createTestImageBuffer();
      
      const response = await request(app)
        .post('/api/upload/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('image', testImageBuffer, 'test.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('url');
    });

    it('should fail without authentication', async () => {
      const testImageBuffer = createTestImageBuffer();
      
      const response = await request(app)
        .post('/api/upload/profile')
        .attach('image', testImageBuffer, 'test.jpg')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail without file', async () => {
      const response = await request(app)
        .post('/api/upload/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('file');
    });
  });

  describe('POST /api/upload/issue-media', () => {
    it('should upload issue media when authenticated', async () => {
      const testImageBuffer = createTestImageBuffer();
      
      const response = await request(app)
        .post('/api/upload/issue-media')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('media', testImageBuffer, 'issue1.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should upload multiple files', async () => {
      const testImageBuffer1 = createTestImageBuffer();
      const testImageBuffer2 = createTestImageBuffer();
      
      const response = await request(app)
        .post('/api/upload/issue-media')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('media', testImageBuffer1, 'issue2.jpg')
        .attach('media', testImageBuffer2, 'issue3.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.length).toBe(2);
    });

    it('should fail without authentication', async () => {
      const testImageBuffer = createTestImageBuffer();
      
      const response = await request(app)
        .post('/api/upload/issue-media')
        .attach('media', testImageBuffer, 'test.jpg')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail with too many files', async () => {
      const testImageBuffer = createTestImageBuffer();
      
      const request_builder = request(app)
        .post('/api/upload/issue-media')
        .set('Authorization', `Bearer ${userToken}`);

      // Attach 6 files (limit is 5)
      for (let i = 0; i < 6; i++) {
        request_builder.attach('media', testImageBuffer, `test${i}.jpg`);
      }

      const response = await request_builder.expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/limit|Unexpected field/i);
    });
  });

  describe('DELETE /api/upload/media', () => {
    it('should delete media when authenticated', async () => {
      const response = await request(app)
        .delete('/api/upload/media')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ publicId: 'test-public-id' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .delete('/api/upload/media')
        .send({ publicId: 'test-public-id' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail without publicId', async () => {
      const response = await request(app)
        .delete('/api/upload/media')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Public ID');
    });
  });

  describe('GET /api/upload/media/:publicId', () => {
    it('should get media info when authenticated', async () => {
      const response = await request(app)
        .get('/api/upload/media/test-public-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/upload/media/test-public-id')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle non-existent media', async () => {
      const response = await request(app)
        .get('/api/upload/media/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('not found');
    });
  });
});

module.exports = {};
