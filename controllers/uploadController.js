const multer = require('multer');
const {
  cloudinary,
  uploadImage,
  uploadVideo,
  deleteAsset,
  extractPublicId,
  isValidImage,
  isValidVideo,
} = require('../utils/cloudinary');
const mediaService = require('../services/mediaService');

// Configure multer for memory storage (no disk storage)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    
    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
});

/**
 * Upload profile image
 */
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    if (!isValidImage(req.file)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid image file' 
      });
    }

    // Upload to Cloudinary directly from memory buffer
    const result = await uploadImage(req.file.buffer, 'naagrik/profiles', {
      public_id: `profile_${req.user.id}_${Date.now()}`,
      overwrite: true,
    });

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      },
    });
  } catch (error) {
    console.error('Profile image upload error:', error);

    res.status(500).json({ 
      success: false, 
      message: 'Image upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Upload issue media (images and videos)
 */
const uploadIssueMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files uploaded' 
      });
    }

    const { issueId } = req.body; // Optional - if provided, save to DB immediately

    const uploadPromises = req.files.map(async (file) => {
      try {
        let result;
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');

        if (isImage && isValidImage(file)) {
          result = await uploadImage(file.buffer, 'naagrik/issues', {
            public_id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          });
        } else if (isVideo && isValidVideo(file)) {
          result = await uploadVideo(file.buffer, 'naagrik/issues', {
            public_id: `issue_video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          });
        } else {
          throw new Error(`Invalid file type: ${file.mimetype}`);
        }

        return {
          url: result.secure_url,
          publicId: result.public_id,
          type: isImage ? 'image' : 'video',
          width: result.width || null,
          height: result.height || null,
          duration: result.duration || null,
        };
      } catch (error) {
        throw error;
      }
    });

    const uploadResults = await Promise.all(uploadPromises);

    // If issueId provided, save to database immediately
    if (issueId && req.user) {
      try {
        const mediaRecords = await mediaService.createMultipleMediaRecords(
          issueId, 
          req.user.id, 
          uploadResults
        );
        
        return res.json({
          success: true,
          data: {
            media: uploadResults,
            records: mediaRecords
          },
        });
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // Return upload results even if DB save fails
      }
    }

    res.json({
      success: true,
      data: uploadResults,
    });
  } catch (error) {
    console.error('Issue media upload error:', error);

    res.status(500).json({ 
      success: false, 
      message: 'Media upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Delete media from Cloudinary
 */
const deleteMedia = async (req, res) => {
  try {
    const { publicId, type = 'image' } = req.body;

    if (!publicId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Public ID is required' 
      });
    }

    const result = await deleteAsset(publicId, type);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Media deletion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Media deletion failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get media info
 */
const getMediaInfo = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Public ID is required' 
      });
    }

    // Get resource info from Cloudinary
    const result = await cloudinary.api.resource(publicId);

    res.json({
      success: true,
      data: {
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        resourceType: result.resource_type,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        createdAt: result.created_at,
      },
    });
  } catch (error) {
    console.error('Get media info error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get media info',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  upload,
  uploadProfileImage,
  uploadIssueMedia,
  deleteMedia,
  getMediaInfo,
};
