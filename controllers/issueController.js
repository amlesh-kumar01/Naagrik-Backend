const issueService = require('../services/issueService');
const mediaService = require('../services/mediaService');
const { formatApiResponse } = require('../utils/helpers');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept images and videos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: fileFilter
});

const issueController = {
  // Create new issue (with optional media upload)
  async createIssue(req, res, next) {
    try {
      const issueData = req.body;
      const userId = req.user.id;
      const uploadedFiles = req.files;
      
      // Create the issue first
      const issue = await issueService.createIssue(issueData, userId);
      
      // If files were uploaded, use mediaService to handle everything
      let mediaRecords = [];
      if (uploadedFiles && uploadedFiles.length > 0) {
        mediaRecords = await mediaService.processAndSaveFiles(issue.id, userId, uploadedFiles);
      }
      
      // Get the complete issue with media for response
      const completeIssue = await issueService.getIssueById(issue.id, false, userId);
      
      res.status(201).json(formatApiResponse(
        true,
        { 
          issue: completeIssue,
          uploadedMedia: mediaRecords
        },
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
      
      const currentUserId = req.user?.id; // Get current user ID for vote status
      
      const filters = {
        status,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        userId,
        search,
        nearLat: nearLat ? parseFloat(nearLat) : undefined,
        nearLng: nearLng ? parseFloat(nearLng) : undefined,
        radius: radius ? parseFloat(radius) : undefined
      };
      
      const result = await issueService.getIssues(filters, parseInt(page), parseInt(limit), currentUserId);
      
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
      const currentUserId = req.user?.id; // Get current user ID for vote status
      
      const issue = await issueService.getIssueById(id, true, currentUserId);
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
      const issue = await issueService.getIssueById(issueId, false, userId);
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

  // Get user vote status for an issue
  async getUserVoteStatus(req, res, next) {
    try {
      const { issueId } = req.params;
      const userId = req.user.id;
      
      const voteStatus = await issueService.getUserVoteStatus(issueId, userId);
      
      res.json(formatApiResponse(
        true,
        voteStatus,
        'User vote status retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Delete user vote on an issue
  async deleteVote(req, res, next) {
    try {
      const { issueId } = req.params;
      const userId = req.user.id;
      
      const result = await issueService.deleteVote(issueId, userId);
      
      res.json(formatApiResponse(
        true,
        result,
        'Vote removed successfully'
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
      const issue = await issueService.getIssueById(id, false, userId);
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
      const { mediaItems } = req.body;
      const userId = req.user.id;

      let mediaRecords;
      
      if (Array.isArray(mediaItems)) {
        // Multiple media items
        mediaRecords = await mediaService.createMultipleMediaRecords(issueId, userId, mediaItems);
      } else {
        // Single media item (legacy support)
        const { mediaUrl, mediaType, isThumbnail = false } = req.body;
        
        const mediaRecord = await mediaService.createMediaRecord({
          issueId,
          userId,
          url: mediaUrl,
          type: mediaType,
          isThumbnail
        });
        mediaRecords = [mediaRecord];
      }

      res.status(201).json(formatApiResponse(
        true,
        { media: mediaRecords },
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
      const { mediaId, thumbnailUrl } = req.body;
      const userId = req.user.id;

      let result;
      
      if (mediaId) {
        // Set existing media as thumbnail
        result = await mediaService.setIssueThumbnail(issueId, mediaId, userId);
      } else if (thumbnailUrl) {
        // Add new thumbnail (legacy support)
        result = await mediaService.updateIssueThumbnail(issueId, thumbnailUrl, userId);
      } else {
        return res.status(400).json(formatApiResponse(
          false,
          null,
          'Either mediaId or thumbnailUrl is required'
        ));
      }

      res.json(formatApiResponse(
        true,
        { thumbnail: result },
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

      const removedMedia = await mediaService.deleteMedia(mediaId, userId);

      res.json(formatApiResponse(
        true,
        { removedMedia },
        'Media removed from issue successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get media for an issue
  async getIssueMedia(req, res, next) {
    try {
      const { issueId } = req.params;
      
      const media = await mediaService.getIssueMedia(issueId);

      res.json(formatApiResponse(
        true,
        { media },
        'Issue media retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Bulk add media to issue (for upload integration)
  async bulkAddMediaToIssue(req, res, next) {
    try {
      const { issueId } = req.params;
      const { mediaUrls } = req.body;
      const userId = req.user.id;

      const mediaRecords = await mediaService.createMultipleMediaRecords(issueId, userId, mediaUrls);

      res.status(201).json(formatApiResponse(
        true,
        { media: mediaRecords },
        'Media added to issue successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Advanced filtering for issues
  async getIssuesWithFilters(req, res, next) {
    try {
      const {
        status,
        category,
        priority,
        lat,
        lng,
        radius,
        startDate,
        endDate,
        search,
        limit,
        offset
      } = req.query;

      const currentUserId = req.user?.id; // Get current user ID for vote status

      const filters = {
        status: status ? (Array.isArray(status) ? status : [status]) : undefined,
        category: category ? parseInt(category) : undefined,
        priority: priority || 'recent',
        location: lat && lng ? { 
          lat: parseFloat(lat), 
          lng: parseFloat(lng), 
          radius: radius ? parseInt(radius) : 5000 
        } : undefined,
        dateRange: startDate || endDate ? {
          start: startDate ? new Date(startDate) : undefined,
          end: endDate ? new Date(endDate) : undefined
        } : undefined,
        search,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        currentUserId // Add current user ID to filters
      };

      const issues = await issueService.getIssuesWithFilters(filters);

      res.json(formatApiResponse(
        true,
        { 
          issues,
          filters: filters,
          total: issues.length
        },
        'Filtered issues retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get trending issues
  async getTrendingIssues(req, res, next) {
    try {
      const { limit } = req.query;
      const currentUserId = req.user?.id; // Get current user ID for vote status
      
      const issues = await issueService.getTrendingIssues(parseInt(limit) || 20, currentUserId);

      res.json(formatApiResponse(
        true,
        { issues },
        'Trending issues retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get issue statistics
  async getIssueStatistics(req, res, next) {
    try {
      const stats = await issueService.getIssueStatistics();

      res.json(formatApiResponse(
        true,
        { stats },
        'Issue statistics retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Bulk update issue status (Admin/Steward only)
  async bulkUpdateStatus(req, res, next) {
    try {
      const { issueIds, status, reason } = req.body;
      const userId = req.user.id;

      // Validate status
      const validStatuses = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED', 'DUPLICATE'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json(formatApiResponse(
          false,
          null,
          'Invalid status'
        ));
      }

      const updatedIssues = await issueService.bulkUpdateStatus(issueIds, status, userId, reason);

      res.json(formatApiResponse(
        true,
        { 
          updated: updatedIssues.length,
          issues: updatedIssues
        },
        `${updatedIssues.length} issues updated successfully`
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get issues requiring steward attention
  async getIssuesRequiringAttention(req, res, next) {
    try {
      const stewardId = req.user.id;
      
      const issues = await issueService.getIssuesRequiringAttention(stewardId, stewardId);

      res.json(formatApiResponse(
        true,
        { issues },
        'Issues requiring attention retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get categories with statistics
  async getCategoriesWithStats(req, res, next) {
    try {
      const categories = await issueService.getCategoriesWithStats();

      res.json(formatApiResponse(
        true,
        { categories },
        'Categories with statistics retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get issues by location
  async getIssuesByLocation(req, res, next) {
    try {
      const { lat, lng, radius = 5000, status, limit = 50 } = req.query;
      const currentUserId = req.user?.id; // Get current user ID for vote status

      if (!lat || !lng) {
        return res.status(400).json(formatApiResponse(
          false,
          null,
          'Latitude and longitude are required'
        ));
      }

      const filters = {
        location: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          radius: parseInt(radius)
        },
        status: status ? [status] : undefined,
        limit: parseInt(limit),
        currentUserId // Add current user ID for vote status
      };

      const issues = await issueService.getIssuesWithFilters(filters);

      res.json(formatApiResponse(
        true,
        { issues },
        'Location-based issues retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get my issues (for current user)
  async getMyIssues(req, res, next) {
    try {
      const userId = req.user.id;
      const { status, limit, offset } = req.query;

      const filters = {
        userId,
        status: status ? [status] : undefined,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        currentUserId: userId // Add current user ID for vote status
      };

      const issues = await issueService.getIssuesWithFilters(filters);

      res.json(formatApiResponse(
        true,
        { issues },
        'Your issues retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  }
};

// Export both the controller and multer middleware
module.exports = {
  ...issueController,
  uploadMiddleware: upload.array('media', 5) // Accept up to 5 files with field name 'media'
};
