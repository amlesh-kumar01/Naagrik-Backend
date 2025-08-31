const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const { authenticateToken, requireSteward, requireAdmin, optionalAuth } = require('../middleware/auth');
const { checkStewardCategoryAccess, checkZoneExists } = require('../middleware/zoneAccess');
const rateLimitService = require('../services/redis/rateLimitService');
const { handleValidationErrors } = require('../middleware/errors');
const {
  createIssueValidation,
  updateIssueStatusValidation,
  markDuplicateValidation,
  voteValidation,
  issueFilterValidation,
  findSimilarIssuesValidation,
  addMediaToIssueValidation,
  updateIssueThumbnailValidation,
  removeMediaValidation
} = require('../middleware/validation');
const { body, query, param } = require('express-validator');

// Additional validation for new endpoints
const bulkUpdateValidation = [
  body('issueIds').isArray().withMessage('Issue IDs must be an array'),
  body('issueIds.*').isUUID().withMessage('Each issue ID must be a valid UUID'),
  body('status').isIn(['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED', 'DUPLICATE']).withMessage('Invalid status'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
];

const hardDeleteIssueValidation = [
  param('issueId')
    .isUUID()
    .withMessage('Valid issue ID is required')
];

const locationFilterValidation = [
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  query('radius').optional().isInt({ min: 100, max: 50000 }).withMessage('Radius must be between 100 and 50000 meters')
];

const advancedFilterValidation = [
  query('priority').optional().isIn(['recent', 'votes', 'urgent', 'oldest']).withMessage('Invalid priority filter'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
];

// Public/Optional auth routes
router.get('/', 
  optionalAuth,
  issueFilterValidation,
  handleValidationErrors,
  issueController.getIssues
);

router.get('/categories', 
  issueController.getCategories
);

// New filtering and analytics endpoints
router.get('/filter/advanced', 
  optionalAuth,
  advancedFilterValidation,
  handleValidationErrors,
  issueController.getIssuesWithFilters
);

router.get('/analytics/trending', 
  optionalAuth,
  issueController.getTrendingIssues
);

router.get('/analytics/statistics', 
  optionalAuth,
  issueController.getIssueStatistics
);

router.get('/analytics/categories', 
  optionalAuth,
  issueController.getCategoriesWithStats
);

router.get('/filter/location', 
  optionalAuth,
  locationFilterValidation,
  handleValidationErrors,
  issueController.getIssuesByLocation
);

// User-specific routes
router.get('/my/issues', 
  authenticateToken,
  issueController.getMyIssues
);

router.get('/steward/attention', 
  authenticateToken,
  requireSteward,
  issueController.getIssuesRequiringAttention
);

router.get('/:id', 
  optionalAuth,
  issueController.getIssueById
);

router.get('/:id/history', 
  optionalAuth,
  issueController.getIssueHistory
);

// Protected routes
router.post('/', 
  authenticateToken,
  rateLimitService.issueRateLimit(),
  issueController.uploadMiddleware,  // Process multipart/form-data FIRST
  createIssueValidation,
  handleValidationErrors,
  checkZoneExists, // Validate zone selection
  issueController.createIssue
);

router.post('/find-similar', 
  authenticateToken,
  findSimilarIssuesValidation,
  handleValidationErrors,
  issueController.findSimilarIssues
);

router.post('/:issueId/vote', 
  authenticateToken,
  rateLimitService.createMiddleware({
    maxRequests: 100,
    windowSeconds: 3600,
    type: 'vote',
    keyGenerator: (req) => req.user?.id || req.ip
  }),
  voteValidation,
  handleValidationErrors,
  issueController.voteIssue
);

router.get('/:issueId/vote-status',
  authenticateToken,
  issueController.getUserVoteStatus
);

router.delete('/:issueId/vote',
  authenticateToken,
  rateLimitService.createMiddleware({
    maxRequests: 100,
    windowSeconds: 3600,
    type: 'vote',
    keyGenerator: (req) => req.user?.id || req.ip
  }),
  issueController.deleteVote
);

router.delete('/:id', 
  authenticateToken,
  issueController.deleteIssue
);

// Hard delete route (SUPER_ADMIN or owner only)
router.delete('/:issueId/hard-delete', 
  authenticateToken,
  hardDeleteIssueValidation,
  handleValidationErrors,
  issueController.hardDeleteIssue
);

// Media management routes
router.post('/:issueId/media', 
  authenticateToken,
  addMediaToIssueValidation,
  handleValidationErrors,
  issueController.addMediaToIssue
);

router.put('/:issueId/thumbnail', 
  authenticateToken,
  updateIssueThumbnailValidation,
  handleValidationErrors,
  issueController.updateIssueThumbnail
);

router.delete('/media/:mediaId', 
  authenticateToken,
  removeMediaValidation,
  handleValidationErrors,
  issueController.removeMediaFromIssue
);

// Steward/Admin only routes (category access checked in services)
router.put('/:id/status', 
  authenticateToken,
  requireSteward,
  updateIssueStatusValidation,
  handleValidationErrors,
  checkStewardCategoryAccess, // Check category access for stewards
  issueController.updateIssueStatus
);

router.post('/:id/mark-duplicate', 
  authenticateToken,
  requireSteward,
  markDuplicateValidation,
  handleValidationErrors,
  checkStewardCategoryAccess, // Check category access for stewards
  issueController.markAsDuplicate
);

// Bulk operations (Admin/Steward only with zone access handled in service)
router.put('/bulk/status', 
  authenticateToken,
  requireSteward,
  bulkUpdateValidation,
  handleValidationErrors,
  issueController.bulkUpdateStatus
);

module.exports = router;
