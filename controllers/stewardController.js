const stewardService = require('../services/stewardService');
const { formatApiResponse } = require('../utils/helpers');

const stewardController = {
  // Submit steward application
  async submitApplication(req, res, next) {
    try {
      const { justification } = req.body;
      const userId = req.user.id;
      
      // Check if user already has an application
      const existingApplication = await stewardService.getApplicationByUserId(userId);
      if (existingApplication) {
        return res.status(409).json(formatApiResponse(
          false,
          null,
          'You already have a steward application'
        ));
      }
      
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
      
      const application = await stewardService.getApplicationByUserId(userId);
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

  // Assign steward to zone (Admin only)
  async assignStewardToZone(req, res, next) {
    try {
      const { stewardId, zoneId } = req.body;
      
      const assignment = await stewardService.assignStewardToZone(stewardId, zoneId);
      
      res.json(formatApiResponse(
        true,
        { assignment },
        'Steward assigned to zone successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Remove steward from zone (Admin only)
  async removeStewardFromZone(req, res, next) {
    try {
      const { stewardId, zoneId } = req.body;
      
      const result = await stewardService.removeStewardFromZone(stewardId, zoneId);
      if (!result) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'Assignment not found'
        ));
      }
      
      res.json(formatApiResponse(
        true,
        null,
        'Steward removed from zone successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get steward's assigned zones
  async getMyStewardZones(req, res, next) {
    try {
      const stewardId = req.user.id;
      
      const zones = await stewardService.getStewardZones(stewardId);
      
      res.json(formatApiResponse(
        true,
        { zones },
        'Steward zones retrieved successfully'
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
  }
};

module.exports = stewardController;
