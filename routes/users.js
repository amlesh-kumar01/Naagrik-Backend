const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errors');
const { paginationValidation } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

// Additional validation middleware
const updateReputationValidation = [
  param('id').isUUID().withMessage('User ID must be a valid UUID'),
  body('change').isInt({ min: -1000, max: 1000 }).withMessage('Reputation change must be between -1000 and 1000'),
  body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Reason is required and must be less than 500 characters')
];

const updateStatusValidation = [
  param('id').isUUID().withMessage('User ID must be a valid UUID'),
  body('suspended').isBoolean().withMessage('Suspended must be a boolean'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
];

const bulkUpdateRoleValidation = [
  body('userIds').isArray().withMessage('User IDs must be an array'),
  body('userIds.*').isUUID().withMessage('Each user ID must be a valid UUID'),
  body('role').isIn(['CITIZEN', 'STEWARD', 'SUPER_ADMIN']).withMessage('Invalid role')
];

const userFilterValidation = [
  query('reputationMin').optional().isInt({ min: 0 }).withMessage('Minimum reputation must be non-negative'),
  query('reputationMax').optional().isInt({ min: 0 }).withMessage('Maximum reputation must be non-negative'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
];

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

// Admin-only routes
router.get('/', 
  authenticateToken,
  requireAdmin,
  userController.getAllUsers
);

router.get('/admin/statistics', 
  authenticateToken,
  requireAdmin,
  userController.getUserStatistics
);

router.get('/admin/filtered', 
  authenticateToken,
  requireAdmin,
  userFilterValidation,
  handleValidationErrors,
  userController.getFilteredUsers
);

router.get('/:id/activity', 
  authenticateToken,
  requireAdmin,
  userController.getUserActivitySummary
);

router.get('/:id/history', 
  authenticateToken,
  requireAdmin,
  userController.getUserHistory
);

router.put('/:id/role', 
  authenticateToken,
  requireAdmin,
  userController.updateUserRole
);

router.put('/:id/reputation', 
  authenticateToken,
  requireAdmin,
  updateReputationValidation,
  handleValidationErrors,
  userController.updateUserReputation
);

router.put('/:id/status', 
  authenticateToken,
  requireAdmin,
  updateStatusValidation,
  handleValidationErrors,
  userController.updateUserStatus
);

router.put('/bulk/role', 
  authenticateToken,
  requireAdmin,
  bulkUpdateRoleValidation,
  handleValidationErrors,
  userController.bulkUpdateRole
);

module.exports = router;
