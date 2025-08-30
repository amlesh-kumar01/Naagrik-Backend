const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badgeController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errors');
const { body, param } = require('express-validator');

// Validation middleware
const createBadgeValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Badge name is required and must be less than 100 characters'),
  body('description').trim().isLength({ min: 1, max: 500 }).withMessage('Description is required and must be less than 500 characters'),
  body('iconUrl').optional().isURL().withMessage('Icon URL must be a valid URL'),
  body('requiredScore').isInt({ min: 0 }).withMessage('Required score must be a non-negative integer')
];

const updateBadgeValidation = [
  param('id').isInt().withMessage('Badge ID must be an integer'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Badge name is required and must be less than 100 characters'),
  body('description').trim().isLength({ min: 1, max: 500 }).withMessage('Description is required and must be less than 500 characters'),
  body('iconUrl').optional().isURL().withMessage('Icon URL must be a valid URL'),
  body('requiredScore').isInt({ min: 0 }).withMessage('Required score must be a non-negative integer')
];

const badgeIdValidation = [
  param('id').isInt().withMessage('Badge ID must be an integer')
];

const awardBadgeValidation = [
  body('userId').isUUID().withMessage('User ID must be a valid UUID'),
  body('badgeId').isInt().withMessage('Badge ID must be an integer')
];

// Public routes (read-only)
router.get('/', badgeController.getAllBadges);

router.get('/:id', 
  badgeIdValidation,
  handleValidationErrors,
  badgeController.getBadgeById
);

router.get('/:id/holders', 
  badgeIdValidation,
  handleValidationErrors,
  badgeController.getBadgeHolders
);

router.get('/:id/stats', 
  badgeIdValidation,
  handleValidationErrors,
  badgeController.getBadgeStats
);

// Admin-only routes
router.post('/', 
  authenticateToken,
  requireAdmin,
  createBadgeValidation,
  handleValidationErrors,
  badgeController.createBadge
);

router.put('/:id', 
  authenticateToken,
  requireAdmin,
  updateBadgeValidation,
  handleValidationErrors,
  badgeController.updateBadge
);

router.delete('/:id', 
  authenticateToken,
  requireAdmin,
  badgeIdValidation,
  handleValidationErrors,
  badgeController.deleteBadge
);

router.post('/award', 
  authenticateToken,
  requireAdmin,
  awardBadgeValidation,
  handleValidationErrors,
  badgeController.awardBadge
);

router.post('/remove', 
  authenticateToken,
  requireAdmin,
  awardBadgeValidation,
  handleValidationErrors,
  badgeController.removeBadge
);

module.exports = router;
