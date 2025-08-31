const stewardService = require('../services/stewardService');
const { formatApiResponse } = require('../utils/helpers');

const stewardController = {
  // Submit steward application
  async submitApplication(req, res, next) {
    try {
      const { justification } = req.body;
      const userId = req.user.id;
      
      const application = await stewardService.submitApplication(userId, justification);
      
      res.status(201).json(formatApiResponse(
        true,
        { application },
        'Steward application submitted successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get user's application status
  async getMyApplication(req, res, next) {
    try {
      const userId = req.user.id;
      
      const application = await stewardService.getMyApplication(userId);
      if (!application) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'No application found'
        ));
      }
      
      res.json(formatApiResponse(
        true,
        { application },
        'Application retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get all pending applications (Admin only)
  async getPendingApplications(req, res, next) {
    try {
      const applications = await stewardService.getPendingApplications();
      
      res.json(formatApiResponse(
        true,
        { applications },
        'Pending applications retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Review application (Admin only)
  async reviewApplication(req, res, next) {
    try {
      const { id } = req.params;
      const { status, feedback } = req.body;
      const reviewerId = req.user.id;
      
      const application = await stewardService.reviewApplication(id, reviewerId, status, feedback);
      
      res.json(formatApiResponse(
        true,
        { application },
        `Application ${status.toLowerCase()} successfully`
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get all stewards (Admin only)
  async getAllStewards(req, res, next) {
    try {
      const stewards = await stewardService.getAllStewards();
      
      res.json(formatApiResponse(
        true,
        { stewards },
        'Stewards retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Assign steward to category in zone (Admin only)
  async assignStewardToCategory(req, res, next) {
    try {
      const { stewardId, categoryId, zoneId, notes } = req.body;
      const adminId = req.user.id;
      
      const assignment = await stewardService.assignStewardToCategory(
        stewardId, 
        categoryId, 
        zoneId, 
        adminId, 
        notes
      );
      
      res.json(formatApiResponse(
        true,
        { assignment },
        'Steward assigned to category in zone successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Remove steward from category-zone assignment (Admin only)
  async removeStewardFromCategory(req, res, next) {
    try {
      const { stewardId, categoryId, zoneId } = req.body;
      const adminId = req.user.id;
      
      const result = await stewardService.removeStewardFromCategory(
        stewardId, 
        categoryId, 
        zoneId, 
        adminId
      );
      
      res.json(formatApiResponse(
        true,
        { result },
        'Steward removed from category assignment successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get steward's assigned categories and zones
  async getMyStewardCategories(req, res, next) {
    try {
      const stewardId = req.user.id;
      
      const categories = await stewardService.getStewardCategories(stewardId);
      
      res.json(formatApiResponse(
        true,
        { categories },
        'Steward category assignments retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Add steward note to issue
  async addStewardNote(req, res, next) {
    try {
      const { issueId } = req.params;
      const { note } = req.body;
      const stewardId = req.user.id;
      
      const stewardNote = await stewardService.addStewardNote(issueId, stewardId, note);
      
      res.status(201).json(formatApiResponse(
        true,
        { note: stewardNote },
        'Steward note added successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get steward notes for issue
  async getStewardNotes(req, res, next) {
    try {
      const { issueId } = req.params;
      
      const notes = await stewardService.getStewardNotes(issueId);
      
      res.json(formatApiResponse(
        true,
        { notes },
        'Steward notes retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get steward performance stats
  async getStewardStats(req, res, next) {
    try {
      const { stewardId } = req.params;
      
      const stats = await stewardService.getStewardStats(stewardId);
      
      res.json(formatApiResponse(
        true,
        { stats },
        'Steward statistics retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get my steward stats
  async getMyStewardStats(req, res, next) {
    try {
      const stewardId = req.user.id;
      
      const stats = await stewardService.getStewardStats(stewardId);
      
      res.json(formatApiResponse(
        true,
        { stats },
        'Your steward statistics retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get steward's manageable issues
  async getMyStewardIssues(req, res, next) {
    try {
      const stewardId = req.user.id;
      const { status, categoryId, zoneId, limit = 50, offset = 0 } = req.query;
      
      const filters = {
        status,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        zoneId,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
      const issues = await stewardService.getStewardIssues(stewardId, filters);
      
      res.json(formatApiResponse(
        true,
        { issues },
        'Manageable issues retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get issues requiring steward attention
  async getIssuesRequiringAttention(req, res, next) {
    try {
      const stewardId = req.user.id;
      const { limit = 20 } = req.query;
      
      const issues = await stewardService.getIssuesRequiringAttention(stewardId, parseInt(limit));
      
      res.json(formatApiResponse(
        true,
        { issues },
        'Issues requiring attention retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Bulk assign steward to multiple categories in a zone (Admin only)
  async bulkAssignStewardToCategories(req, res, next) {
    try {
      const { stewardId, categoryIds, zoneId, notes } = req.body;
      const adminId = req.user.id;
      
      const result = await stewardService.bulkAssignStewardToCategories(
        stewardId,
        categoryIds,
        zoneId,
        adminId,
        notes
      );
      
      res.json(formatApiResponse(
        true,
        { result },
        `Steward assigned to ${result.assigned_count} categories successfully`
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get steward workload summary
  async getStewardWorkload(req, res, next) {
    try {
      const stewardId = req.params.stewardId || req.user.id;
      
      // If not admin and trying to get other steward's workload, deny
      if (req.user.role !== 'SUPER_ADMIN' && stewardId !== req.user.id) {
        return res.status(403).json(formatApiResponse(
          false,
          null,
          'Access denied: You can only view your own workload'
        ));
      }
      
      const workload = await stewardService.getStewardWorkload(stewardId);
      
      res.json(formatApiResponse(
        true,
        { workload },
        'Steward workload retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get steward categories (Admin only)
  async getStewardCategories(req, res, next) {
    try {
      const { stewardId } = req.params;
      
      const categories = await stewardService.getStewardCategories(stewardId);
      
      res.json(formatApiResponse(
        true,
        { categories },
        'Steward categories retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  }
};

module.exports = stewardController;
