const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const rateLimitService = require('../services/rateLimitService');
const { handleValidationErrors } = require('../middleware/errors');
const { createCommentValidation, updateCommentValidation } = require('../middleware/validation');

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

router.post('/:commentId/flag', 
  authenticateToken,
  commentController.flagComment
);

// Get user's comments
router.get('/users/:userId/comments', 
  optionalAuth,
  commentController.getUserComments
);

module.exports = router;
