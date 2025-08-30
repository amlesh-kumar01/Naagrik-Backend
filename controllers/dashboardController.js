const dashboardService = require('../services/dashboardService');
const { formatApiResponse } = require('../utils/helpers');

const dashboardController = {
  // Get overall system statistics
  async getSystemStats(req, res, next) {
    try {
      const stats = await dashboardService.getSystemStats();
      
      res.json(formatApiResponse(
        true,
        { stats },
        'System statistics retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get issue trends
  async getIssueTrends(req, res, next) {
    try {
      const { days } = req.query;
      const trends = await dashboardService.getIssueTrends(parseInt(days) || 30);
      
      res.json(formatApiResponse(
        true,
        { trends },
        'Issue trends retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get top issues by votes
  async getTopIssues(req, res, next) {
    try {
      const { limit } = req.query;
      const issues = await dashboardService.getTopIssues(parseInt(limit) || 10);
      
      res.json(formatApiResponse(
        true,
        { issues },
        'Top issues retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get user activity statistics
  async getUserActivityStats(req, res, next) {
    try {
      const stats = await dashboardService.getUserActivityStats();
      
      res.json(formatApiResponse(
        true,
        { stats },
        'User activity statistics retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get steward performance metrics
  async getStewardPerformance(req, res, next) {
    try {
      const { limit } = req.query;
      const performance = await dashboardService.getStewardPerformance(parseInt(limit) || 10);
      
      res.json(formatApiResponse(
        true,
        { performance },
        'Steward performance metrics retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get issue categories statistics
  async getCategoryStats(req, res, next) {
    try {
      const stats = await dashboardService.getCategoryStats();
      
      res.json(formatApiResponse(
        true,
        { stats },
        'Category statistics retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get geographic distribution of issues
  async getIssueDistribution(req, res, next) {
    try {
      const { limit } = req.query;
      const distribution = await dashboardService.getIssueDistribution(parseInt(limit) || 50);
      
      res.json(formatApiResponse(
        true,
        { distribution },
        'Issue distribution retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get resolution time analytics
  async getResolutionTimeStats(req, res, next) {
    try {
      const stats = await dashboardService.getResolutionTimeStats();
      
      res.json(formatApiResponse(
        true,
        { stats },
        'Resolution time statistics retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get steward workload (for current user if steward)
  async getMyStewardWorkload(req, res, next) {
    try {
      const stewardId = req.user.id;
      const workload = await dashboardService.getStewardWorkload(stewardId);
      
      res.json(formatApiResponse(
        true,
        { workload },
        'Your workload retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get steward workload by ID (admin only)
  async getStewardWorkload(req, res, next) {
    try {
      const { stewardId } = req.params;
      const workload = await dashboardService.getStewardWorkload(stewardId);
      
      res.json(formatApiResponse(
        true,
        { workload },
        'Steward workload retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get critical issues requiring attention
  async getCriticalIssues(req, res, next) {
    try {
      const issues = await dashboardService.getCriticalIssues();
      
      res.json(formatApiResponse(
        true,
        { issues },
        'Critical issues retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get critical issues for current steward
  async getMyCriticalIssues(req, res, next) {
    try {
      const stewardId = req.user.id;
      const issues = await dashboardService.getCriticalIssues(stewardId);
      
      res.json(formatApiResponse(
        true,
        { issues },
        'Your critical issues retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get admin dashboard overview
  async getAdminDashboard(req, res, next) {
    try {
      const [
        systemStats,
        userActivityStats,
        categoryStats,
        topIssues,
        criticalIssues,
        stewardPerformance
      ] = await Promise.all([
        dashboardService.getSystemStats(),
        dashboardService.getUserActivityStats(),
        dashboardService.getCategoryStats(),
        dashboardService.getTopIssues(5),
        dashboardService.getCriticalIssues(),
        dashboardService.getStewardPerformance(5)
      ]);

      res.json(formatApiResponse(
        true,
        {
          systemStats,
          userActivityStats,
          categoryStats,
          topIssues,
          criticalIssues,
          stewardPerformance
        },
        'Admin dashboard data retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get steward dashboard overview
  async getStewardDashboard(req, res, next) {
    try {
      const stewardId = req.user.id;
      
      const [
        workload,
        criticalIssues,
        recentActivity
      ] = await Promise.all([
        dashboardService.getStewardWorkload(stewardId),
        dashboardService.getCriticalIssues(stewardId),
        dashboardService.getIssueTrends(7)
      ]);

      res.json(formatApiResponse(
        true,
        {
          workload,
          criticalIssues,
          recentActivity
        },
        'Steward dashboard data retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  }
};

module.exports = dashboardController;
