const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errors');
const { paginationValidation } = require('../middleware/validation');

// Public routes
router.get('/leaderboard', 
  optionalAuth,
  paginationValidation,
  handleValidationErrors,
  userController.getLeaderboard
);

router.get('/search', 
  authenticateToken,
  userController.searchUsers
);

router.get('/:id', 
  optionalAuth,
  userController.getUserProfile
);

router.get('/:id/badges', 
  optionalAuth,
  userController.getUserBadges
);

router.get('/:id/stats', 
  optionalAuth,
  userController.getUserStats
);

// Admin only routes
router.put('/:id/role', 
  authenticateToken,
  requireAdmin,
  userController.updateUserRole
);

module.exports = router;
