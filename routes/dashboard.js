const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireSteward, requireAdmin } = require('../middleware/auth');

// Public dashboard stats (basic info)
router.get('/public/stats', dashboardController.getSystemStats);

// Authenticated user routes
router.get('/trends', 
  authenticateToken,
  dashboardController.getIssueTrends
);

router.get('/top-issues', 
  authenticateToken,
  dashboardController.getTopIssues
);

router.get('/categories', 
  authenticateToken,
  dashboardController.getCategoryStats
);

router.get('/distribution', 
  authenticateToken,
  dashboardController.getIssueDistribution
);

// Steward-specific routes
router.get('/steward/workload', 
  authenticateToken,
  requireSteward,
  dashboardController.getMyStewardWorkload
);

router.get('/steward/critical-issues', 
  authenticateToken,
  requireSteward,
  dashboardController.getMyCriticalIssues
);

router.get('/steward/dashboard', 
  authenticateToken,
  requireSteward,
  dashboardController.getStewardDashboard
);

// Admin-only routes
router.get('/admin/overview', 
  authenticateToken,
  requireAdmin,
  dashboardController.getAdminDashboard
);

router.get('/admin/user-activity', 
  authenticateToken,
  requireAdmin,
  dashboardController.getUserActivityStats
);

router.get('/admin/steward-performance', 
  authenticateToken,
  requireAdmin,
  dashboardController.getStewardPerformance
);

router.get('/admin/resolution-time', 
  authenticateToken,
  requireAdmin,
  dashboardController.getResolutionTimeStats
);

router.get('/admin/critical-issues', 
  authenticateToken,
  requireAdmin,
  dashboardController.getCriticalIssues
);

router.get('/admin/steward/:stewardId/workload', 
  authenticateToken,
  requireAdmin,
  dashboardController.getStewardWorkload
);

module.exports = router;
