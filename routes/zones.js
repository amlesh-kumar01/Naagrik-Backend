const express = require('express');
const router = express.Router();
const adminZoneController = require('../controllers/adminZoneController');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errors');
const { body, param } = require('express-validator');

// Validation middleware
const createZoneValidation = [
  body('area_name').trim().isLength({ min: 1, max: 100 }).withMessage('Area name is required and must be less than 100 characters'),
  body('state').trim().isLength({ min: 1, max: 50 }).withMessage('State is required and must be less than 50 characters'),
  body('pincode').isLength({ min: 6, max: 6 }).withMessage('Pincode must be exactly 6 digits'),
  body('city').optional().trim().isLength({ max: 50 }).withMessage('City must be less than 50 characters')
];

const updateZoneValidation = [
  param('id').isUUID().withMessage('Zone ID must be a valid UUID'),
  body('area_name').trim().isLength({ min: 1, max: 100 }).withMessage('Area name is required and must be less than 100 characters'),
  body('state').trim().isLength({ min: 1, max: 50 }).withMessage('State is required and must be less than 50 characters'),
  body('pincode').isLength({ min: 6, max: 6 }).withMessage('Pincode must be exactly 6 digits'),
  body('city').optional().trim().isLength({ max: 50 }).withMessage('City must be less than 50 characters')
];

const zoneIdValidation = [
  param('id').isUUID().withMessage('Zone ID must be a valid UUID')
];

// Public routes (for zone selection during issue creation)
router.get('/public/available', 
  optionalAuth,
  adminZoneController.getAvailableZones
);

router.get('/public/search',
  optionalAuth,
  adminZoneController.searchZones
);

// All admin routes require authentication
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
