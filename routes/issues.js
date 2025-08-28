const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const { authenticateToken, requireSteward, optionalAuth } = require('../middleware/auth');
const { createIssueLimiter, voteLimiter } = require('../middleware/rateLimiter');
const { handleValidationErrors } = require('../middleware/errors');
const {
  createIssueValidation,
  updateIssueStatusValidation,
  markDuplicateValidation,
  voteValidation,
  issueFilterValidation,
  findSimilarIssuesValidation
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
  createIssueLimiter,
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
  voteLimiter,
  voteValidation,
  handleValidationErrors,
  issueController.voteIssue
);

router.delete('/:id', 
  authenticateToken,
  issueController.deleteIssue
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
