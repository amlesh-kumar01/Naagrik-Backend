const issueService = require('../services/issueService');
const { formatApiResponse } = require('../utils/helpers');

const issueController = {
  // Create new issue
  async createIssue(req, res, next) {
    try {
      const issueData = req.body;
      const userId = req.user.id;
      
      const issue = await issueService.createIssue(issueData, userId);
      
      res.status(201).json(formatApiResponse(
        true,
        { issue },
        'Issue created successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get all issues with filtering and pagination
  async getIssues(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        categoryId,
        userId,
        search,
        nearLat,
        nearLng,
        radius
      } = req.query;
      
      const filters = {
        status,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        userId,
        search,
        nearLat: nearLat ? parseFloat(nearLat) : undefined,
        nearLng: nearLng ? parseFloat(nearLng) : undefined,
        radius: radius ? parseFloat(radius) : undefined
      };
      
      const result = await issueService.getIssues(filters, parseInt(page), parseInt(limit));
      
      res.json(formatApiResponse(
        true,
        result.issues,
        'Issues retrieved successfully',
        result.pagination
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get single issue by ID
  async getIssueById(req, res, next) {
    try {
      const { id } = req.params;
      
      const issue = await issueService.getIssueById(id);
      if (!issue) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'Issue not found'
        ));
      }
      
      res.json(formatApiResponse(
        true,
        { issue },
        'Issue retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Update issue status
  async updateIssueStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const userId = req.user.id;
      
      const issue = await issueService.updateIssueStatus(id, status, userId, reason);
      
      res.json(formatApiResponse(
        true,
        { issue },
        'Issue status updated successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Mark issue as duplicate
  async markAsDuplicate(req, res, next) {
    try {
      const { id } = req.params;
      const { primaryIssueId, reason } = req.body;
      const userId = req.user.id;
      
      const issue = await issueService.markAsDuplicate(id, primaryIssueId, userId, reason);
      
      res.json(formatApiResponse(
        true,
        { issue },
        'Issue marked as duplicate successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Vote on issue
  async voteIssue(req, res, next) {
    try {
      const { issueId } = req.params;
      const { voteType } = req.body;
      const userId = req.user.id;
      
      // Check if user is trying to vote on their own issue
      const issue = await issueService.getIssueById(issueId, false);
      if (!issue) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'Issue not found'
        ));
      }
      
      if (issue.user_id === userId) {
        return res.status(400).json(formatApiResponse(
          false,
          null,
          'You cannot vote on your own issue'
        ));
      }
      
      const result = await issueService.voteIssue(issueId, userId, voteType);
      
      res.json(formatApiResponse(
        true,
        result,
        'Vote recorded successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get issue categories
  async getCategories(req, res, next) {
    try {
      const categories = await issueService.getCategories();
      
      res.json(formatApiResponse(
        true,
        { categories },
        'Categories retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get issue history
  async getIssueHistory(req, res, next) {
    try {
      const { id } = req.params;
      
      const history = await issueService.getIssueHistory(id);
      
      res.json(formatApiResponse(
        true,
        { history },
        'Issue history retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Delete issue (soft delete)
  async deleteIssue(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Check if user owns the issue or is admin/steward
      const issue = await issueService.getIssueById(id, false);
      if (!issue) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'Issue not found'
        ));
      }
      
      if (issue.user_id !== userId && !['STEWARD', 'SUPER_ADMIN'].includes(req.user.role)) {
        return res.status(403).json(formatApiResponse(
          false,
          null,
          'You can only delete your own issues'
        ));
      }
      
      const deletedIssue = await issueService.deleteIssue(id, userId);
      
      res.json(formatApiResponse(
        true,
        { issue: deletedIssue },
        'Issue deleted successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Find similar issues (placeholder for AI integration)
  async findSimilarIssues(req, res, next) {
    try {
      const { text } = req.body;
      
      // For now, return empty results since AI is not integrated yet
      // TODO: Implement AI-powered similarity search
      
      res.json(formatApiResponse(
        true,
        { similarIssues: [] },
        'Similar issues search completed (AI integration pending)'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get all issue categories
  async getCategories(req, res, next) {
    try {
      const categories = await issueService.getCategories();
      
      res.json(formatApiResponse(
        true,
        { categories },
        'Categories retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Add media to existing issue
  async addMediaToIssue(req, res, next) {
    try {
      const { issueId } = req.params;
      const { mediaUrl, mediaType, isThumbnail = false } = req.body;
      const userId = req.user.id;

      const media = await issueService.addMediaToIssue(issueId, userId, mediaUrl, mediaType, isThumbnail);

      res.status(201).json(formatApiResponse(
        true,
        { media },
        'Media added to issue successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Update issue thumbnail
  async updateIssueThumbnail(req, res, next) {
    try {
      const { issueId } = req.params;
      const { thumbnailUrl } = req.body;
      const userId = req.user.id;

      const result = await issueService.updateIssueThumbnail(issueId, thumbnailUrl, userId);

      res.json(formatApiResponse(
        true,
        { result },
        'Issue thumbnail updated successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Remove media from issue
  async removeMediaFromIssue(req, res, next) {
    try {
      const { mediaId } = req.params;
      const userId = req.user.id;

      const removedMedia = await issueService.removeMediaFromIssue(mediaId, userId);

      if (!removedMedia) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'Media not found or you do not have permission to remove it'
        ));
      }

      res.json(formatApiResponse(
        true,
        { removedMedia },
        'Media removed from issue successfully'
      ));
    } catch (error) {
      next(error);
    }
  }
};

module.exports = issueController;
