const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const {
  cloudinary,
  uploadImage,
  uploadVideo,
  deleteAsset,
  extractPublicId,
  isValidImage,
  isValidVideo,
} = require('../utils/cloudinary');

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../temp');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

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
      // Clean up temporary file
      await fs.unlink(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid image file' 
      });
    }

    // Upload to Cloudinary
    const result = await uploadImage(req.file.path, 'naagrik/profiles', {
      public_id: `profile_${req.user.id}_${Date.now()}`,
      overwrite: true,
    });

    // Clean up temporary file
    await fs.unlink(req.file.path);

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
    
    // Clean up temporary file if it exists
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up temp file:', unlinkError);
      }
    }

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

    const uploadPromises = req.files.map(async (file) => {
      try {
        let result;
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');

        if (isImage && isValidImage(file)) {
          result = await uploadImage(file.path, 'naagrik/issues', {
            public_id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          });
        } else if (isVideo && isValidVideo(file)) {
          result = await uploadVideo(file.path, 'naagrik/issues', {
            public_id: `issue_video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          });
        } else {
          throw new Error(`Invalid file type: ${file.mimetype}`);
        }

        // Clean up temporary file
        await fs.unlink(file.path);

        return {
          url: result.secure_url,
          publicId: result.public_id,
          type: isImage ? 'image' : 'video',
          width: result.width || null,
          height: result.height || null,
          duration: result.duration || null,
        };
      } catch (error) {
        // Clean up temporary file
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up temp file:', unlinkError);
        }
        throw error;
      }
    });

    const uploadResults = await Promise.all(uploadPromises);

    res.json({
      success: true,
      data: uploadResults,
    });
  } catch (error) {
    console.error('Issue media upload error:', error);
    
    // Clean up any remaining temporary files
    if (req.files) {
      await Promise.all(
        req.files.map(async (file) => {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error('Error cleaning up temp file:', unlinkError);
          }
        })
      );
    }

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
