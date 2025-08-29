const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const { authenticateToken, requireSteward, optionalAuth } = require('../middleware/auth');
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
  createIssueValidation,
  handleValidationErrors,
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

router.delete('/:id', 
  authenticateToken,
  issueController.deleteIssue
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

// Steward/Admin only routes
router.put('/:id/status', 
  authenticateToken,
  requireSteward,
  updateIssueStatusValidation,
  handleValidationErrors,
  issueController.updateIssueStatus
);

router.post('/:id/mark-duplicate', 
  authenticateToken,
  requireSteward,
  markDuplicateValidation,
  handleValidationErrors,
  issueController.markAsDuplicate
);

module.exports = router;
