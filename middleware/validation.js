const { body, param, query } = require('express-validator');

const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .isUUID()
    .withMessage('Valid refresh token is required')
];

const createIssueValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('categoryId')
    .isInt({ min: 1 })
    .withMessage('Valid category ID is required'),
  body('zoneId')
    .isUUID()
    .withMessage('Valid zone ID is required'),
  body('locationLat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('locationLng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters')
];

const updateIssueStatusValidation = [
  param('id')
    .isUUID()
    .withMessage('Valid issue ID is required'),
  body('status')
    .isIn(['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'])
    .withMessage('Valid status is required'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
];

const markDuplicateValidation = [
  param('id')
    .isUUID()
    .withMessage('Valid issue ID is required'),
  body('primaryIssueId')
    .isUUID()
    .withMessage('Valid primary issue ID is required'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
];

const createCommentValidation = [
  param('issueId')
    .isUUID()
    .withMessage('Valid issue ID is required'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  body('parentCommentId')
    .optional()
    .isUUID()
    .withMessage('Parent comment ID must be a valid UUID if provided')
];

const voteValidation = [
  param('issueId')
    .isUUID()
    .withMessage('Valid issue ID is required'),
  body('voteType')
    .isIn([1, -1])
    .withMessage('Vote type must be 1 (upvote) or -1 (downvote)')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const issueFilterValidation = [
  ...paginationValidation,
  query('status')
    .optional()
    .isIn(['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED', 'DUPLICATE'])
    .withMessage('Invalid status filter'),
  query('categoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  query('userId')
    .optional()
    .isUUID()
    .withMessage('Valid user ID is required'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
];

const stewardApplicationValidation = [
  body('justification')
    .trim()
    .isLength({ min: 50, max: 1000 })
    .withMessage('Justification must be between 50 and 1000 characters')
];

const reviewApplicationValidation = [
  param('id')
    .isUUID()
    .withMessage('Valid application ID is required'),
  body('status')
    .isIn(['APPROVED', 'REJECTED'])
    .withMessage('Status must be APPROVED or REJECTED'),
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Feedback must not exceed 500 characters')
];

const addStewardNoteValidation = [
  param('issueId')
    .isUUID()
    .withMessage('Valid issue ID is required'),
  body('note')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Note must be between 1 and 1000 characters')
];

const findSimilarIssuesValidation = [
  body('text')
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Text must be between 5 and 1000 characters')
];

const updateCommentValidation = [
  param('commentId')
    .isUUID()
    .withMessage('Invalid comment ID'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
];

const addMediaToIssueValidation = [
  param('issueId')
    .isUUID()
    .withMessage('Valid issue ID is required'),
  body('mediaUrl')
    .isURL()
    .withMessage('Valid media URL is required'),
  body('mediaType')
    .isIn(['IMAGE', 'VIDEO'])
    .withMessage('Media type must be either IMAGE or VIDEO'),
  body('isThumbnail')
    .optional()
    .isBoolean()
    .withMessage('isThumbnail must be a boolean value')
];

const updateIssueThumbnailValidation = [
  param('issueId')
    .isUUID()
    .withMessage('Valid issue ID is required'),
  body('thumbnailUrl')
    .isURL()
    .withMessage('Valid thumbnail URL is required')
];

const removeMediaValidation = [
  param('mediaId')
    .isUUID()
    .withMessage('Valid media ID is required')
];

const flagCommentValidation = [
  param('commentId')
    .isUUID()
    .withMessage('Valid comment ID is required'),
  body('reason')
    .optional()
    .isIn(['SPAM', 'INAPPROPRIATE', 'MISLEADING', 'HARASSMENT', 'OTHER'])
    .withMessage('Invalid flag reason'),
  body('details')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Details must not exceed 500 characters')
];

const reviewFlagValidation = [
  param('commentId')
    .isUUID()
    .withMessage('Valid comment ID is required'),
  body('action')
    .isIn(['APPROVE', 'DELETE'])
    .withMessage('Action must be APPROVE or DELETE'),
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback must not exceed 1000 characters')
];

const hardDeleteIssueValidation = [
  param('issueId')
    .isUUID()
    .withMessage('Valid issue ID is required')
];

module.exports = {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  createIssueValidation,
  updateIssueStatusValidation,
  markDuplicateValidation,
  createCommentValidation,
  updateCommentValidation,
  voteValidation,
  paginationValidation,
  issueFilterValidation,
  stewardApplicationValidation,
  reviewApplicationValidation,
  addStewardNoteValidation,
  findSimilarIssuesValidation,
  addMediaToIssueValidation,
  updateIssueThumbnailValidation,
  removeMediaValidation,
  flagCommentValidation,
  reviewFlagValidation,
  hardDeleteIssueValidation
};
