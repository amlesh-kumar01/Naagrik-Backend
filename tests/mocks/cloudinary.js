/**
 * Mock Cloudinary utilities for testing
 */

const mockCloudinary = {
  cloudinary: {
    api: {
      resource: jest.fn().mockResolvedValue({
        public_id: 'test-public-id',
        secure_url: 'https://res.cloudinary.com/test/image/upload/v1234567890/test-image.jpg',
        format: 'jpg',
        resource_type: 'image',
        width: 100,
        height: 100,
        bytes: 50000,
        created_at: '2023-01-01T00:00:00Z'
      })
    }
  },

  uploadImage: jest.fn().mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/test/image/upload/v1234567890/test-image.jpg',
    public_id: 'test-image',
    width: 100,
    height: 100,
    bytes: 50000,
    format: 'jpg'
  }),

  uploadVideo: jest.fn().mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/test/video/upload/v1234567890/test-video.mp4',
    public_id: 'test-video',
    bytes: 1000000,
    format: 'mp4',
    duration: 30
  }),

  deleteAsset: jest.fn().mockResolvedValue({
    result: 'ok'
  }),

  extractPublicId: jest.fn((url) => {
    // Extract public ID from mock URL
    const match = url.match(/\/([^\/]+)\.(jpg|png|mp4|webm)$/);
    return match ? match[1] : 'test-public-id';
  }),

  isValidImage: jest.fn(() => true),
  isValidVideo: jest.fn(() => true)
};

module.exports = mockCloudinary;
