const adminZoneService = require('../services/adminZoneService');
const { formatApiResponse } = require('../utils/helpers');

const adminZoneController = {
  // Create new admin zone
  async createZone(req, res, next) {
    try {
      const { name, description } = req.body;
      
      const zone = await adminZoneService.createZone(name, description);
      
      res.status(201).json(formatApiResponse(
        true,
        { zone },
        'Admin zone created successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get all zones
  async getAllZones(req, res, next) {
    try {
      const zones = await adminZoneService.getAllZones();
      
      res.json(formatApiResponse(
        true,
        { zones },
        'Admin zones retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get zone by ID
  async getZoneById(req, res, next) {
    try {
      const { id } = req.params;
      
      const zone = await adminZoneService.getZoneById(id);
      if (!zone) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'Zone not found'
        ));
      }
      
      res.json(formatApiResponse(
        true,
        { zone },
        'Zone retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Update zone
  async updateZone(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      
      const zone = await adminZoneService.updateZone(id, name, description);
      
      res.json(formatApiResponse(
        true,
        { zone },
        'Zone updated successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Delete zone
  async deleteZone(req, res, next) {
    try {
      const { id } = req.params;
      
      await adminZoneService.deleteZone(id);
      
      res.json(formatApiResponse(
        true,
        null,
        'Zone deleted successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get zone statistics
  async getZoneStats(req, res, next) {
    try {
      const { id } = req.params;
      
      const stats = await adminZoneService.getZoneStats(id);
      
      res.json(formatApiResponse(
        true,
        { stats },
        'Zone statistics retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get issues in zone
  async getZoneIssues(req, res, next) {
    try {
      const { id } = req.params;
      const { status, priority, limit, offset } = req.query;
      
      const filters = {
        status,
        priority,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      };
      
      const issues = await adminZoneService.getZoneIssues(id, filters);
      
      res.json(formatApiResponse(
        true,
        { issues },
        'Zone issues retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get stewards assigned to zone
  async getZoneStewards(req, res, next) {
    try {
      const { id } = req.params;
      
      const stewards = await adminZoneService.getZoneStewards(id);
      
      res.json(formatApiResponse(
        true,
        { stewards },
        'Zone stewards retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  }
};

module.exports = adminZoneController;
