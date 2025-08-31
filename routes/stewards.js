const express = require('express');
const router = express.Router();
const stewardController = require('../controllers/stewardController');
const { authenticateToken, requireSteward, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errors');
const {
  stewardApplicationValidation,
  reviewApplicationValidation,
  addStewardNoteValidation
} = require('../middleware/validation');

// Steward application routes
router.post('/applications', 
  authenticateToken,
  stewardApplicationValidation,
  handleValidationErrors,
  stewardController.submitApplication
);

router.get('/applications/me', 
  authenticateToken,
  stewardController.getMyApplication
);

// Steward-only routes
router.get('/categories/me', 
  authenticateToken,
  requireSteward,
  stewardController.getMyStewardCategories
);

router.get('/issues/me', 
  authenticateToken,
  requireSteward,
  stewardController.getMyStewardIssues
);

router.get('/issues/attention', 
  authenticateToken,
  requireSteward,
  stewardController.getIssuesRequiringAttention
);

router.get('/workload/:stewardId?', 
  authenticateToken,
  requireSteward,
  stewardController.getStewardWorkload
);

router.post('/issues/:issueId/notes', 
  authenticateToken,
  requireSteward,
  addStewardNoteValidation,
  handleValidationErrors,
  stewardController.addStewardNote
);

router.get('/issues/:issueId/notes', 
  authenticateToken,
  requireSteward,
  stewardController.getStewardNotes
);

router.get('/stats/me', 
  authenticateToken,
  requireSteward,
  stewardController.getMyStewardStats
);

// Admin-only routes
router.get('/applications/pending', 
  authenticateToken,
  requireAdmin,
  stewardController.getPendingApplications
);

router.put('/applications/:id/review', 
  authenticateToken,
  requireAdmin,
  reviewApplicationValidation,
  handleValidationErrors,
  stewardController.reviewApplication
);

router.get('/', 
  authenticateToken,
  requireAdmin,
  stewardController.getAllStewards
);

router.post('/assignments/category', 
  authenticateToken,
  requireAdmin,
  stewardController.assignStewardToCategory
);

router.post('/assignments/bulk-categories', 
  authenticateToken,
  requireAdmin,
  stewardController.bulkAssignStewardToCategories
);

router.delete('/assignments/category', 
  authenticateToken,
  requireAdmin,
  stewardController.removeStewardFromCategory
);

router.get('/:stewardId/stats', 
  authenticateToken,
  requireAdmin,
  stewardController.getStewardStats
);

router.get('/:stewardId/categories', 
  authenticateToken,
  requireAdmin,
  stewardController.getStewardCategories
);

module.exports = router;
