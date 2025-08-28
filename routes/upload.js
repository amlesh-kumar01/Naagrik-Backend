const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  upload,
  uploadProfileImage,
  uploadIssueMedia,
  deleteMedia,
  getMediaInfo,
} = require('../controllers/uploadController');

const router = express.Router();

// Upload profile image
router.post('/profile', 
  authenticateToken, 
  upload.single('image'), 
  uploadProfileImage
);

// Upload issue media (images and videos)
router.post('/issue-media', 
  authenticateToken, 
  upload.array('media', 5), 
  uploadIssueMedia
);

// Delete media
router.delete('/media', 
  authenticateToken, 
  deleteMedia
);

// Get media info
router.get('/media/:publicId', 
  authenticateToken, 
  getMediaInfo
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 100MB.'
    });
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files. Maximum is 5 files per upload.'
    });
  }
  
  res.status(400).json({
    success: false,
    message: error.message || 'Upload failed'
  });
});

module.exports = router;
