const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authenticateToken, optionalAuth, requireSteward } = require('../middleware/auth');
const rateLimitService = require('../services/redis/rateLimitService');
const { handleValidationErrors } = require('../middleware/errors');
const { 
  createCommentValidation, 
  updateCommentValidation, 
  flagCommentValidation,
  reviewFlagValidation 
} = require('../middleware/validation');

// Routes for comments on specific issues
router.get('/issues/:issueId/comments', 
  optionalAuth,
  commentController.getComments
);

router.post('/issues/:issueId/comments', 
  authenticateToken,
  rateLimitService.commentRateLimit(),
  createCommentValidation,
  handleValidationErrors,
  commentController.createComment
);

// Routes for individual comments
router.get('/:commentId', 
  optionalAuth,
  commentController.getComment
);

router.put('/:commentId', 
  authenticateToken,
  updateCommentValidation,
  handleValidationErrors,
  commentController.updateComment
);

router.delete('/:commentId', 
  authenticateToken,
  commentController.deleteComment
);

// Comment flagging and moderation
router.post('/:commentId/flag', 
  authenticateToken,
  flagCommentValidation,
  handleValidationErrors,
  commentController.flagComment
);

// Admin/Steward routes for moderation
router.get('/flagged', 
  authenticateToken,
  requireSteward,
  commentController.getFlaggedComments
);

router.put('/:commentId/review', 
  authenticateToken,
  requireSteward,
  reviewFlagValidation,
  handleValidationErrors,
  commentController.reviewFlaggedComment
);

// Get user's comments
router.get('/users/:userId/comments', 
  optionalAuth,
  commentController.getUserComments
);

module.exports = router;
