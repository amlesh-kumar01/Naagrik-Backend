const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Path to the file
 * @param {string} folder - Cloudinary folder to upload to
 * @param {Object} options - Additional upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadImage = async (filePath, folder = 'naagrik', options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto',
      ...options,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary image upload error:', error);
    throw new Error('Image upload failed');
  }
};

/**
 * Upload video to Cloudinary
 * @param {string} filePath - Path to the file
 * @param {string} folder - Cloudinary folder to upload to
 * @param {Object} options - Additional upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadVideo = async (filePath, folder = 'naagrik/videos', options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'video',
      quality: 'auto',
      format: 'mp4',
      ...options,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary video upload error:', error);
    throw new Error('Video upload failed');
  }
};

/**
 * Delete asset from Cloudinary
 * @param {string} publicId - Public ID of the asset
 * @param {string} resourceType - Type of resource (image, video)
 * @returns {Promise<Object>} Deletion result
 */
const deleteAsset = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Asset deletion failed');
  }
};

/**
 * Generate optimized URL for an asset
 * @param {string} publicId - Public ID of the asset
 * @param {Object} transformations - Transformation options
 * @returns {string} Optimized URL
 */
const getOptimizedUrl = (publicId, transformations = {}) => {
  return cloudinary.url(publicId, {
    quality: 'auto',
    fetch_format: 'auto',
    secure: true,
    ...transformations,
  });
};

/**
 * Generate profile image URL with transformations
 * @param {string} publicId - Public ID of the profile image
 * @param {number} size - Size of the profile image (default: 200)
 * @returns {string} Transformed profile image URL
 */
const getProfileImageUrl = (publicId, size = 200) => {
  return cloudinary.url(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    fetch_format: 'auto',
    secure: true,
  });
};

/**
 * Generate issue image URL with transformations
 * @param {string} publicId - Public ID of the issue image
 * @param {Object} options - Transformation options
 * @returns {string} Transformed issue image URL
 */
const getIssueImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    width: 800,
    height: 600,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto',
    secure: true,
  };

  return cloudinary.url(publicId, { ...defaultOptions, ...options });
};

/**
 * Generate video thumbnail URL
 * @param {string} publicId - Public ID of the video
 * @param {Object} options - Transformation options
 * @returns {string} Video thumbnail URL
 */
const getVideoThumbnailUrl = (publicId, options = {}) => {
  const defaultOptions = {
    resource_type: 'video',
    format: 'jpg',
    quality: 'auto',
    secure: true,
  };

  return cloudinary.url(publicId, { ...defaultOptions, ...options });
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} Public ID
 */
const extractPublicId = (url) => {
  if (!url) return null;
  
  const matches = url.match(/\/v\d+\/(.+)\./);
  return matches ? matches[1] : null;
};

/**
 * Validate image file
 * @param {Object} file - File object from multer
 * @returns {boolean} Whether file is valid image
 */
const isValidImage = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  return allowedTypes.includes(file.mimetype) && file.size <= maxSize;
};

/**
 * Validate video file
 * @param {Object} file - File object from multer
 * @returns {boolean} Whether file is valid video
 */
const isValidVideo = (file) => {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  return allowedTypes.includes(file.mimetype) && file.size <= maxSize;
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadVideo,
  deleteAsset,
  getOptimizedUrl,
  getProfileImageUrl,
  getIssueImageUrl,
  getVideoThumbnailUrl,
  extractPublicId,
  isValidImage,
  isValidVideo,
};
