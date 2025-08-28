const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const hashPassword = async (password) => {
  const bcrypt = require('bcryptjs');
  return await bcrypt.hash(password, 12);
};

const comparePassword = async (password, hashedPassword) => {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, hashedPassword);
};

const generateSecureHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

const sanitizeUser = (user) => {
  const { password_hash, ...sanitizedUser } = user;
  return sanitizedUser;
};

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

const formatApiResponse = (success, data = null, message = null, pagination = null) => {
  const response = { success };
  
  if (message) response.message = message;
  if (data !== null) response.data = data;
  if (pagination) response.pagination = pagination;
  
  return response;
};

const getPagination = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return { offset, limit: parseInt(limit) };
};

const getPaginationInfo = (page, limit, totalCount) => {
  const totalPages = Math.ceil(totalCount / limit);
  return {
    currentPage: parseInt(page),
    totalPages,
    pageSize: parseInt(limit),
    totalCount: parseInt(totalCount),
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

const calculateReputationChange = (action, currentReputation = 0) => {
  const reputationChanges = {
    'ISSUE_CREATED': 5,
    'ISSUE_UPVOTED': 2,
    'ISSUE_DOWNVOTED': -1,
    'COMMENT_CREATED': 1,
    'ISSUE_RESOLVED': 10,
    'DUPLICATE_REPORTED': 3,
    'HELPFUL_COMMENT': 2,
    'SPAM_PENALTY': -10,
    'VIOLATION_PENALTY': -25
  };

  const change = reputationChanges[action] || 0;
  const newReputation = Math.max(0, currentReputation + change); // Don't go below 0
  
  return { change, newReputation };
};

const formatTimeAgo = (date) => {
  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  
  return new Date(date).toLocaleDateString();
};

module.exports = {
  generateToken,
  hashPassword,
  comparePassword,
  generateSecureHash,
  sanitizeUser,
  calculateDistance,
  formatApiResponse,
  getPagination,
  getPaginationInfo,
  generateRandomString,
  isValidEmail,
  isValidUUID,
  slugify,
  getClientIP,
  calculateReputationChange,
  formatTimeAgo
};
