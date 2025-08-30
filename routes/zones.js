const express = require('express');
const router = express.Router();
const adminZoneController = require('../controllers/adminZoneController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errors');
const { body, param } = require('express-validator');

// Validation middleware
const createZoneValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Zone name is required and must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters')
];

const updateZoneValidation = [
  param('id').isInt().withMessage('Zone ID must be an integer'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Zone name is required and must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters')
];

const zoneIdValidation = [
  param('id').isInt().withMessage('Zone ID must be an integer')
];

// All routes require admin authentication
router.use(authenticateToken, requireAdmin);

// Zone management routes
router.post('/', 
  createZoneValidation,
  handleValidationErrors,
  adminZoneController.createZone
);

router.get('/', 
  adminZoneController.getAllZones
);

router.get('/:id', 
  zoneIdValidation,
  handleValidationErrors,
  adminZoneController.getZoneById
);

router.put('/:id', 
  updateZoneValidation,
  handleValidationErrors,
  adminZoneController.updateZone
);

router.delete('/:id', 
  zoneIdValidation,
  handleValidationErrors,
  adminZoneController.deleteZone
);

// Zone statistics and management
router.get('/:id/stats', 
  zoneIdValidation,
  handleValidationErrors,
  adminZoneController.getZoneStats
);

router.get('/:id/issues', 
  zoneIdValidation,
  handleValidationErrors,
  adminZoneController.getZoneIssues
);

router.get('/:id/stewards', 
  zoneIdValidation,
  handleValidationErrors,
  adminZoneController.getZoneStewards
);

module.exports = router;
