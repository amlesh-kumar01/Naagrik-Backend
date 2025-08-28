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
  }
};

module.exports = userController;
