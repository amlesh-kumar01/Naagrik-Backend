const badgeService = require('../services/badgeService');
const { formatApiResponse } = require('../utils/helpers');

const badgeController = {
  // Create new badge
  async createBadge(req, res, next) {
    try {
      const { name, description, iconUrl, requiredScore } = req.body;
      
      const badge = await badgeService.createBadge(name, description, iconUrl, requiredScore);
      
      res.status(201).json(formatApiResponse(
        true,
        { badge },
        'Badge created successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get all badges
  async getAllBadges(req, res, next) {
    try {
      const badges = await badgeService.getAllBadges();
      
      res.json(formatApiResponse(
        true,
        { badges },
        'Badges retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get badge by ID
  async getBadgeById(req, res, next) {
    try {
      const { id } = req.params;
      
      const badge = await badgeService.getBadgeById(id);
      if (!badge) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'Badge not found'
        ));
      }
      
      res.json(formatApiResponse(
        true,
        { badge },
        'Badge retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Update badge
  async updateBadge(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, iconUrl, requiredScore } = req.body;
      
      const badge = await badgeService.updateBadge(id, name, description, iconUrl, requiredScore);
      
      res.json(formatApiResponse(
        true,
        { badge },
        'Badge updated successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Delete badge
  async deleteBadge(req, res, next) {
    try {
      const { id } = req.params;
      
      await badgeService.deleteBadge(id);
      
      res.json(formatApiResponse(
        true,
        null,
        'Badge deleted successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Award badge to user
  async awardBadge(req, res, next) {
    try {
      const { userId, badgeId } = req.body;
      
      const userBadge = await badgeService.awardBadgeToUser(userId, badgeId);
      if (!userBadge) {
        return res.status(409).json(formatApiResponse(
          false,
          null,
          'Badge already awarded to user'
        ));
      }
      
      res.json(formatApiResponse(
        true,
        { userBadge },
        'Badge awarded successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Remove badge from user
  async removeBadge(req, res, next) {
    try {
      const { userId, badgeId } = req.body;
      
      const result = await badgeService.removeBadgeFromUser(userId, badgeId);
      if (!result) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'Badge assignment not found'
        ));
      }
      
      res.json(formatApiResponse(
        true,
        null,
        'Badge removed successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get badge holders
  async getBadgeHolders(req, res, next) {
    try {
      const { id } = req.params;
      const { limit, offset } = req.query;
      
      const holders = await badgeService.getBadgeHolders(
        id,
        parseInt(limit) || 50,
        parseInt(offset) || 0
      );
      
      res.json(formatApiResponse(
        true,
        { holders },
        'Badge holders retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get badge statistics
  async getBadgeStats(req, res, next) {
    try {
      const { id } = req.params;
      
      const stats = await badgeService.getBadgeStats(id);
      
      res.json(formatApiResponse(
        true,
        { stats },
        'Badge statistics retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  }
};

module.exports = badgeController;
