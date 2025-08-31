const userService = require('../services/userService');
const { formatApiResponse } = require('../utils/helpers');

const userController = {
  // Get user leaderboard
  async getLeaderboard(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const leaderboard = await userService.getLeaderboard(limit);
      
      res.json(formatApiResponse(
        true,
        { leaderboard },
        'Leaderboard retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get user badges
  async getUserBadges(req, res, next) {
    try {
      const { id } = req.params;
      
      const badges = await userService.getUserBadges(id);
      
      res.json(formatApiResponse(
        true,
        { badges },
        'User badges retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get user profile
  async getUserProfile(req, res, next) {
    try {
      const { id } = req.params;
      
      const user = await userService.findById(id);
      if (!user) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'User not found'
        ));
      }
      
      // Get user stats and badges
      const [stats, badges] = await Promise.all([
        userService.getUserStats(id),
        userService.getUserBadges(id)
      ]);
      
      res.json(formatApiResponse(
        true,
        {
          user: { ...user, stats, badges }
        },
        'User profile retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get current user profile
  async getCurrentUserProfile(req, res, next) {
    try {
      const userId = req.user.id;
      
      const user = await userService.findById(userId);
      if (!user) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'User not found'
        ));
      }
      
      // Get user stats and badges
      const [stats, badges] = await Promise.all([
        userService.getUserStats(userId),
        userService.getUserBadges(userId)
      ]);
      
      res.json(formatApiResponse(
        true,
        {
          user: { ...user, stats, badges }
        },
        'User profile retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get current user stats
  async getCurrentUserStats(req, res, next) {
    try {
      const userId = req.user.id;
      
      const stats = await userService.getUserStats(userId);
      
      res.json(formatApiResponse(
        true,
        { stats },
        'User stats retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get current user badges
  async getCurrentUserBadges(req, res, next) {
    try {
      const userId = req.user.id;
      
      const badges = await userService.getUserBadges(userId);
      
      res.json(formatApiResponse(
        true,
        { badges },
        'User badges retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Search users
  async searchUsers(req, res, next) {
    try {
      const { q: searchTerm } = req.query;
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json(formatApiResponse(
          false,
          null,
          'Search term must be at least 2 characters long'
        ));
      }
      
      const users = await userService.searchUsers(searchTerm.trim());
      
      res.json(formatApiResponse(
        true,
        { users },
        'Users retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Update user role (Admin only)
  async updateUserRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      // Validate role
      const validRoles = ['CITIZEN', 'STEWARD', 'SUPER_ADMIN'];
      if (!validRoles.includes(role)) {
        return res.status(400).json(formatApiResponse(
          false,
          null,
          'Invalid role. Must be one of: CITIZEN, STEWARD, SUPER_ADMIN'
        ));
      }
      
      const user = await userService.updateRole(id, role);
      if (!user) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'User not found'
        ));
      }
      
      res.json(formatApiResponse(
        true,
        { user },
        'User role updated successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get user statistics
  async getUserStats(req, res, next) {
    try {
      const { id } = req.params;
      
      const stats = await userService.getUserStats(id);
      
      res.json(formatApiResponse(
        true,
        { stats },
        'User statistics retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Admin features
  async getAllUsers(req, res, next) {
    try {
      const { role, limit, offset, sortBy, sortOrder } = req.query;
      
      const filters = {
        role,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        sortBy,
        sortOrder
      };
      
      const users = await userService.getAllUsers(filters);
      
      res.json(formatApiResponse(
        true,
        { users },
        'Users retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  async getUserActivitySummary(req, res, next) {
    try {
      const { id } = req.params;
      
      const activity = await userService.getUserActivitySummary(id);
      
      res.json(formatApiResponse(
        true,
        { activity },
        'User activity summary retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  async updateUserReputation(req, res, next) {
    try {
      const { id } = req.params;
      const { change, reason } = req.body;
      
      if (!reason) {
        return res.status(400).json(formatApiResponse(
          false,
          null,
          'Reason is required for reputation changes'
        ));
      }
      
      const user = await userService.updateReputation(id, change, reason);
      
      res.json(formatApiResponse(
        true,
        { user },
        `User reputation ${change >= 0 ? 'increased' : 'decreased'} by ${Math.abs(change)}`
      ));
    } catch (error) {
      next(error);
    }
  },

  async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { suspended, reason } = req.body;
      
      const result = await userService.updateUserStatus(id, suspended, reason);
      
      res.json(formatApiResponse(
        true,
        result,
        `User ${suspended ? 'suspended' : 'unsuspended'} successfully`
      ));
    } catch (error) {
      next(error);
    }
  },

  async getUserHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { limit, offset } = req.query;
      
      const history = await userService.getUserHistory(
        id,
        parseInt(limit) || 50,
        parseInt(offset) || 0
      );
      
      res.json(formatApiResponse(
        true,
        { history },
        'User history retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  async getUserStatistics(req, res, next) {
    try {
      const stats = await userService.getUserStatistics();
      
      res.json(formatApiResponse(
        true,
        { stats },
        'User statistics retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  async bulkUpdateRole(req, res, next) {
    try {
      const { userIds, role } = req.body;
      const adminId = req.user.id;
      
      // Validate role
      const validRoles = ['CITIZEN', 'STEWARD', 'SUPER_ADMIN'];
      if (!validRoles.includes(role)) {
        return res.status(400).json(formatApiResponse(
          false,
          null,
          'Invalid role'
        ));
      }
      
      const updatedUsers = await userService.bulkUpdateRole(userIds, role, adminId);
      
      res.json(formatApiResponse(
        true,
        { updatedUsers },
        `${updatedUsers.length} users updated successfully`
      ));
    } catch (error) {
      next(error);
    }
  },

  async getFilteredUsers(req, res, next) {
    try {
      const {
        role,
        reputationMin,
        reputationMax,
        registeredAfter,
        registeredBefore,
        hasIssues,
        hasBadges,
        search,
        limit,
        offset
      } = req.query;
      
      const filters = {
        role,
        reputationMin: reputationMin ? parseInt(reputationMin) : undefined,
        reputationMax: reputationMax ? parseInt(reputationMax) : undefined,
        registeredAfter: registeredAfter ? new Date(registeredAfter) : undefined,
        registeredBefore: registeredBefore ? new Date(registeredBefore) : undefined,
        hasIssues: hasIssues === 'true',
        hasBadges: hasBadges === 'true',
        search,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      };
      
      const users = await userService.getFilteredUsers(filters);
      
      res.json(formatApiResponse(
        true,
        { users, filters },
        'Filtered users retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  }
};

module.exports = userController;
