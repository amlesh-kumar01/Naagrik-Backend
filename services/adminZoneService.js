const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const cacheService = require('./redis/cacheService');

const adminZoneService = {
  // Create a new zone
  async createZone(zoneData, adminId) {
    const { name, type, area_name, pincode, description } = zoneData;
    
    if (!name || !type || !area_name || !pincode) {
      throw new Error('Name, type, area_name, and pincode are required');
    }
    
    const result = await transaction(async (client) => {
      // Check if zone with same name and area already exists
      const existingZone = await client.query(
        'SELECT id FROM zones WHERE name = $1 AND area_name = $2 AND is_active = true',
        [name, area_name]
      );
      
      if (existingZone.rows.length > 0) {
        throw new Error('Zone with this name already exists in the specified area');
      }
      
      const zoneResult = await client.query(`
        INSERT INTO zones (name, type, area_name, pincode, description, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, type, area_name, pincode, description, is_active, created_at, updated_at
      `, [name, type, area_name, pincode, description, adminId]);
      
      return zoneResult.rows[0];
    });
    
    // Clear zones cache
    await cacheService.del('zones:all');
    await cacheService.del('zones:active');
    
    return result;
  },

  // Get all zones
  async getAllZones(includeInactive = false) {
    const cacheKey = includeInactive ? 'zones:all' : 'zones:active';
    
    return await cacheService.cached(cacheKey, async () => {
      const whereClause = includeInactive ? '' : 'WHERE z.is_active = true';
      
      const result = await query(`
        SELECT z.id, z.name, z.type, z.area_name, z.pincode, z.description, 
               z.is_active, z.created_at, z.updated_at,
               creator.full_name as created_by_name,
               COUNT(DISTINCT sc.steward_id) as assigned_stewards,
               COUNT(DISTINCT i.id) as total_issues,
               COUNT(DISTINCT CASE WHEN i.status = 'OPEN' THEN i.id END) as open_issues,
               COUNT(DISTINCT CASE WHEN i.status = 'IN_PROGRESS' THEN i.id END) as in_progress_issues,
               COUNT(DISTINCT CASE WHEN i.status = 'RESOLVED' THEN i.id END) as resolved_issues
        FROM zones z
        LEFT JOIN users creator ON z.created_by = creator.id
        LEFT JOIN steward_categories sc ON z.id = sc.zone_id AND sc.is_active = true
        LEFT JOIN issues i ON z.id = i.zone_id
        ${whereClause}
        GROUP BY z.id, z.name, z.type, z.area_name, z.pincode, z.description,
                 z.is_active, z.created_at, z.updated_at, creator.full_name
        ORDER BY z.area_name, z.name
      `);
      
      return result.rows;
    }, 300); // Cache for 5 minutes
  },

  // Get zone by ID
  async getZoneById(zoneId) {
    const cacheKey = cacheService.generateKey('zone', zoneId);
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT z.id, z.name, z.type, z.area_name, z.pincode, z.description,
               z.is_active, z.created_at, z.updated_at,
               creator.full_name as created_by_name,
               COUNT(DISTINCT sc.steward_id) as assigned_stewards,
               COUNT(DISTINCT sc.category_id) as assigned_categories,
               COUNT(DISTINCT i.id) as total_issues,
               COUNT(DISTINCT CASE WHEN i.status = 'OPEN' THEN i.id END) as open_issues,
               COUNT(DISTINCT CASE WHEN i.status = 'IN_PROGRESS' THEN i.id END) as in_progress_issues,
               COUNT(DISTINCT CASE WHEN i.status = 'RESOLVED' THEN i.id END) as resolved_issues
        FROM zones z
        LEFT JOIN users creator ON z.created_by = creator.id
        LEFT JOIN steward_categories sc ON z.id = sc.zone_id AND sc.is_active = true
        LEFT JOIN issues i ON z.id = i.zone_id
        WHERE z.id = $1
        GROUP BY z.id, z.name, z.type, z.area_name, z.pincode, z.description,
                 z.is_active, z.created_at, z.updated_at, creator.full_name
      `, [zoneId]);
      
      return result.rows[0] || null;
    }, 300);
  },

  // Get zones by area or search
  async searchZones(searchTerm, filters = {}) {
    const { type, area_name, is_active = true } = filters;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;
    
    if (searchTerm) {
      whereConditions.push(`(z.name ILIKE $${++paramCount} OR z.area_name ILIKE $${paramCount} OR z.pincode ILIKE $${paramCount})`);
      queryParams.push(`%${searchTerm}%`);
    }
    
    if (type) {
      whereConditions.push(`z.type = $${++paramCount}`);
      queryParams.push(type);
    }
    
    if (area_name) {
      whereConditions.push(`z.area_name ILIKE $${++paramCount}`);
      queryParams.push(`%${area_name}%`);
    }
    
    if (is_active !== undefined) {
      whereConditions.push(`z.is_active = $${++paramCount}`);
      queryParams.push(is_active);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const result = await query(`
      SELECT z.id, z.name, z.type, z.area_name, z.pincode, z.description,
             z.is_active, z.created_at,
             COUNT(DISTINCT sc.steward_id) as assigned_stewards,
             COUNT(DISTINCT i.id) as total_issues
      FROM zones z
      LEFT JOIN steward_categories sc ON z.id = sc.zone_id AND sc.is_active = true
      LEFT JOIN issues i ON z.id = i.zone_id
      ${whereClause}
      GROUP BY z.id, z.name, z.type, z.area_name, z.pincode, z.description,
               z.is_active, z.created_at
      ORDER BY z.area_name, z.name
    `, queryParams);
    
    return result.rows;
  },

  // Update zone details
  async updateZone(zoneId, updateData, adminId) {
    const { name, type, area_name, pincode, description, is_active } = updateData;
    
    const result = await transaction(async (client) => {
      const updates = [];
      const values = [];
      let paramCount = 0;
      
      if (name !== undefined) {
        updates.push(`name = $${++paramCount}`);
        values.push(name);
      }
      
      if (type !== undefined) {
        updates.push(`type = $${++paramCount}`);
        values.push(type);
      }
      
      if (area_name !== undefined) {
        updates.push(`area_name = $${++paramCount}`);
        values.push(area_name);
      }
      
      if (pincode !== undefined) {
        updates.push(`pincode = $${++paramCount}`);
        values.push(pincode);
      }
      
      if (description !== undefined) {
        updates.push(`description = $${++paramCount}`);
        values.push(description);
      }
      
      if (is_active !== undefined) {
        updates.push(`is_active = $${++paramCount}`);
        values.push(is_active);
      }
      
      if (updates.length === 0) {
        throw new Error('No fields to update');
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(zoneId);
      
      const result = await client.query(`
        UPDATE zones 
        SET ${updates.join(', ')}
        WHERE id = $${values.length}
        RETURNING id, name, type, area_name, pincode, description, is_active, created_at, updated_at
      `, values);
      
      if (result.rows.length === 0) {
        throw new Error('Zone not found');
      }
      
      // Clear cache
      const cacheKey = cacheService.generateKey('zone', zoneId);
      await cacheService.del(cacheKey);
      await cacheService.del('zones:all');
      await cacheService.del('zones:active');
      
      return result.rows[0];
    });
    
    return result;
  },

  // Delete zone (soft delete)
  async deleteZone(zoneId, adminId) {
    const result = await transaction(async (client) => {
      // Check if zone has active issues
      const activeIssuesCheck = await client.query(
        'SELECT COUNT(*) as count FROM issues WHERE zone_id = $1 AND status IN ($2, $3)',
        [zoneId, 'OPEN', 'IN_PROGRESS']
      );
      
      if (parseInt(activeIssuesCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete zone with active issues. Please resolve all open/in-progress issues first.');
      }
      
      // First deactivate all steward assignments for this zone
      await client.query(`
        UPDATE steward_categories 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE zone_id = $1
      `, [zoneId]);
      
      // Then deactivate the zone
      const zoneResult = await client.query(`
        UPDATE zones 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, name, area_name
      `, [zoneId]);
      
      if (zoneResult.rows.length === 0) {
        throw new Error('Zone not found');
      }
      
      // Clear cache
      const cacheKey = cacheService.generateKey('zone', zoneId);
      await cacheService.del(cacheKey);
      await cacheService.del('zones:all');
      await cacheService.del('zones:active');
      
      return zoneResult.rows[0];
    });
    
    return result;
  },

  // Get comprehensive zone statistics
  async getZoneStats(zoneId) {
    const cacheKey = cacheService.generateKey('zone_stats', zoneId);
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT 
          z.id,
          z.name,
          z.type,
          z.area_name,
          z.pincode,
          COUNT(DISTINCT sc.steward_id) as total_stewards,
          COUNT(DISTINCT sc.category_id) as assigned_categories,
          COUNT(DISTINCT i.id) as total_issues,
          COUNT(DISTINCT CASE WHEN i.status = 'OPEN' THEN i.id END) as open_issues,
          COUNT(DISTINCT CASE WHEN i.status = 'IN_PROGRESS' THEN i.id END) as in_progress_issues,
          COUNT(DISTINCT CASE WHEN i.status = 'RESOLVED' THEN i.id END) as resolved_issues,
          COUNT(DISTINCT CASE WHEN i.urgency_score >= 8 THEN i.id END) as high_priority_issues,
          COUNT(DISTINCT c.id) as total_comments,
          AVG(i.urgency_score) as avg_urgency_score,
          MIN(i.created_at) as oldest_issue_date,
          MAX(i.created_at) as newest_issue_date,
          COUNT(DISTINCT i.user_id) as unique_reporters,
          AVG(CASE WHEN i.status = 'RESOLVED' AND i.resolved_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (i.resolved_at - i.created_at))/3600 END) as avg_resolution_hours
        FROM zones z
        LEFT JOIN steward_categories sc ON z.id = sc.zone_id AND sc.is_active = true
        LEFT JOIN issues i ON z.id = i.zone_id
        LEFT JOIN comments c ON i.id = c.issue_id
        WHERE z.id = $1
        GROUP BY z.id, z.name, z.type, z.area_name, z.pincode
      `, [zoneId]);
      
      if (!result.rows[0]) {
        return null;
      }
      
      const stats = result.rows[0];
      
      // Get category-wise statistics for this zone
      const categoryStats = await query(`
        SELECT 
          ic.id,
          ic.name as category_name,
          COUNT(DISTINCT sc.steward_id) as assigned_stewards,
          COUNT(DISTINCT i.id) as total_issues,
          COUNT(DISTINCT CASE WHEN i.status = 'OPEN' THEN i.id END) as open_issues,
          COUNT(DISTINCT CASE WHEN i.status = 'IN_PROGRESS' THEN i.id END) as in_progress_issues,
          COUNT(DISTINCT CASE WHEN i.status = 'RESOLVED' THEN i.id END) as resolved_issues,
          AVG(CASE WHEN i.status = 'RESOLVED' AND i.resolved_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (i.resolved_at - i.created_at))/3600 END) as avg_resolution_hours
        FROM issue_categories ic
        LEFT JOIN steward_categories sc ON ic.id = sc.category_id AND sc.zone_id = $1 AND sc.is_active = true
        LEFT JOIN issues i ON ic.id = i.category_id AND i.zone_id = $1
        GROUP BY ic.id, ic.name
        ORDER BY total_issues DESC
      `, [zoneId]);
      
      stats.category_stats = categoryStats.rows;
      
      // Get steward performance in this zone
      const stewardStats = await query(`
        SELECT 
          u.id,
          u.full_name,
          u.reputation_score,
          STRING_AGG(DISTINCT ic.name, ', ') as assigned_categories,
          COUNT(DISTINCT ih.issue_id) as issues_handled,
          COUNT(DISTINCT CASE WHEN i.status = 'RESOLVED' THEN ih.issue_id END) as issues_resolved,
          AVG(CASE WHEN i.status = 'RESOLVED' AND i.resolved_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (i.resolved_at - i.created_at))/3600 END) as avg_resolution_hours
        FROM steward_categories sc
        JOIN users u ON sc.steward_id = u.id
        LEFT JOIN issue_categories ic ON sc.category_id = ic.id
        LEFT JOIN issue_history ih ON u.id = ih.user_id
        LEFT JOIN issues i ON ih.issue_id = i.id AND i.zone_id = $1
        WHERE sc.zone_id = $1 AND sc.is_active = true
        GROUP BY u.id, u.full_name, u.reputation_score
        ORDER BY issues_handled DESC
      `, [zoneId]);
      
      stats.steward_performance = stewardStats.rows;
      
      return stats;
    }, 300); // Cache for 5 minutes
  },

  // Get issues within a zone with filtering
  async getZoneIssues(zoneId, filters = {}) {
    const { status, category_id, priority, limit = 50, offset = 0 } = filters;
    
    let whereConditions = ['i.zone_id = $1'];
    let values = [zoneId];
    let paramCount = 1;
    
    if (status) {
      whereConditions.push(`i.status = $${++paramCount}`);
      values.push(status);
    }
    
    if (category_id) {
      whereConditions.push(`i.category_id = $${++paramCount}`);
      values.push(category_id);
    }
    
    if (priority) {
      whereConditions.push(`i.urgency_score >= $${++paramCount}`);
      values.push(priority);
    }
    
    const result = await query(`
      SELECT 
        i.id, i.title, i.description, i.status, i.urgency_score,
        i.location_lat, i.location_lng, i.address,
        i.created_at, i.updated_at, i.resolved_at,
        reporter.full_name as reporter_name,
        ic.name as category_name,
        z.name as zone_name,
        (SELECT COUNT(*) FROM comments WHERE issue_id = i.id) as comment_count,
        (SELECT COUNT(*) FROM issue_votes WHERE issue_id = i.id AND vote_type = 1) as upvote_count,
        (SELECT COUNT(*) FROM issue_votes WHERE issue_id = i.id AND vote_type = -1) as downvote_count
      FROM issues i
      LEFT JOIN users reporter ON i.user_id = reporter.id
      LEFT JOIN issue_categories ic ON i.category_id = ic.id
      LEFT JOIN zones z ON i.zone_id = z.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY i.urgency_score DESC, i.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `, [...values, limit, offset]);
    
    return result.rows;
  },

  // Get stewards assigned to categories in a zone
  async getZoneStewards(zoneId) {
    const result = await query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.reputation_score,
        STRING_AGG(DISTINCT ic.name, ', ') as assigned_categories,
        MIN(sc.assigned_at) as first_assignment_date,
        MAX(sc.assigned_at) as latest_assignment_date,
        assignedBy.full_name as assigned_by_name,
        COUNT(DISTINCT ih.issue_id) as issues_handled,
        COUNT(DISTINCT CASE WHEN i.status = 'RESOLVED' THEN ih.issue_id END) as issues_resolved
      FROM steward_categories sc
      JOIN users u ON sc.steward_id = u.id
      LEFT JOIN users assignedBy ON sc.assigned_by = assignedBy.id
      LEFT JOIN issue_categories ic ON sc.category_id = ic.id
      LEFT JOIN issue_history ih ON u.id = ih.user_id
      LEFT JOIN issues i ON ih.issue_id = i.id AND i.zone_id = $1
      WHERE sc.zone_id = $1 AND sc.is_active = true
      GROUP BY u.id, u.full_name, u.email, u.reputation_score, assignedBy.full_name
      ORDER BY u.full_name
    `, [zoneId]);
    
    return result.rows;
  },

  // Get stewards by category in a zone
  async getCategoryStewards(zoneId, categoryId) {
    const result = await query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.reputation_score,
        sc.assigned_at,
        sc.notes,
        assignedBy.full_name as assigned_by_name,
        COUNT(DISTINCT ih.issue_id) as issues_handled,
        COUNT(DISTINCT CASE WHEN i.status = 'RESOLVED' THEN ih.issue_id END) as issues_resolved
      FROM steward_categories sc
      JOIN users u ON sc.steward_id = u.id
      LEFT JOIN users assignedBy ON sc.assigned_by = assignedBy.id
      LEFT JOIN issue_history ih ON u.id = ih.user_id
      LEFT JOIN issues i ON ih.issue_id = i.id AND i.zone_id = $1 AND i.category_id = $2
      WHERE sc.zone_id = $1 AND sc.category_id = $2 AND sc.is_active = true
      GROUP BY u.id, u.full_name, u.email, u.reputation_score,
               sc.assigned_at, sc.notes, assignedBy.full_name
      ORDER BY u.full_name
    `, [zoneId, categoryId]);
    
    return result.rows;
  },

  // Get all stewards with their zone assignments (admin view)
  async getAllStewardsWithZoneAssignments() {
    const cacheKey = 'stewards:zone_assignments';
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT u.id, u.full_name, u.email, u.reputation_score, u.created_at,
               COUNT(DISTINCT sc.id) as total_assignments,
               COUNT(DISTINCT sc.zone_id) as assigned_zones,
               COUNT(DISTINCT sc.category_id) as assigned_categories,
               STRING_AGG(DISTINCT z.name, ', ') as zone_names,
               STRING_AGG(DISTINCT ic.name, ', ') as category_names,
               COUNT(DISTINCT i.id) as total_issues_handled,
               COUNT(DISTINCT CASE WHEN i.status = 'RESOLVED' THEN i.id END) as issues_resolved,
               AVG(CASE WHEN i.status = 'RESOLVED' AND i.resolved_at IS NOT NULL 
                   THEN EXTRACT(EPOCH FROM (i.resolved_at - i.created_at))/3600 END) as avg_resolution_hours
        FROM users u
        LEFT JOIN steward_categories sc ON u.id = sc.steward_id AND sc.is_active = true
        LEFT JOIN zones z ON sc.zone_id = z.id
        LEFT JOIN issue_categories ic ON sc.category_id = ic.id
        LEFT JOIN issues i ON sc.category_id = i.category_id AND sc.zone_id = i.zone_id
        LEFT JOIN issue_history ih ON u.id = ih.user_id AND ih.issue_id = i.id
        WHERE u.role = 'STEWARD'
        GROUP BY u.id, u.full_name, u.email, u.reputation_score, u.created_at
        ORDER BY u.full_name
      `);
      
      return result.rows;
    }, 300); // Cache for 5 minutes
  },

  // Get zone analytics for dashboard
  async getZoneAnalytics() {
    const cacheKey = 'analytics:zones';
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT 
          z.type,
          COUNT(DISTINCT z.id) as total_zones,
          COUNT(DISTINCT sc.steward_id) as total_stewards,
          COUNT(DISTINCT sc.category_id) as total_categories_assigned,
          COUNT(DISTINCT i.id) as total_issues,
          COUNT(CASE WHEN i.status = 'OPEN' THEN 1 END) as open_issues,
          COUNT(CASE WHEN i.status = 'IN_PROGRESS' THEN 1 END) as in_progress_issues,
          COUNT(CASE WHEN i.status = 'RESOLVED' THEN 1 END) as resolved_issues,
          AVG(i.urgency_score) as avg_urgency_score,
          AVG(CASE WHEN i.status = 'RESOLVED' AND i.resolved_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (i.resolved_at - i.created_at))/3600 END) as avg_resolution_hours
        FROM zones z
        LEFT JOIN steward_categories sc ON z.id = sc.zone_id AND sc.is_active = true
        LEFT JOIN issues i ON z.id = i.zone_id
        WHERE z.is_active = true
        GROUP BY z.type
        ORDER BY z.type
      `);
      
      return result.rows;
    }, 600); // Cache for 10 minutes
  },

  // Get zone summary by area
  async getZonesByArea() {
    const cacheKey = 'zones:by_area';
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT 
          z.area_name,
          COUNT(DISTINCT z.id) as total_zones,
          COUNT(DISTINCT CASE WHEN z.type = 'RESIDENTIAL' THEN z.id END) as residential_zones,
          COUNT(DISTINCT CASE WHEN z.type = 'COMMERCIAL' THEN z.id END) as commercial_zones,
          COUNT(DISTINCT CASE WHEN z.type = 'INDUSTRIAL' THEN z.id END) as industrial_zones,
          COUNT(DISTINCT CASE WHEN z.type = 'INSTITUTIONAL' THEN z.id END) as institutional_zones,
          COUNT(DISTINCT sc.steward_id) as total_stewards,
          COUNT(DISTINCT i.id) as total_issues,
          COUNT(CASE WHEN i.status = 'OPEN' THEN 1 END) as open_issues,
          COUNT(CASE WHEN i.status = 'RESOLVED' THEN 1 END) as resolved_issues
        FROM zones z
        LEFT JOIN steward_categories sc ON z.id = sc.zone_id AND sc.is_active = true
        LEFT JOIN issues i ON z.id = i.zone_id
        WHERE z.is_active = true
        GROUP BY z.area_name
        ORDER BY z.area_name
      `);
      
      return result.rows;
    }, 300); // Cache for 5 minutes
  },

  // Get performance metrics for a zone
  async getZonePerformanceMetrics(zoneId, days = 30) {
    const result = await query(`
      SELECT 
        DATE(i.created_at) as date,
        COUNT(DISTINCT i.id) as issues_created,
        COUNT(DISTINCT CASE WHEN i.status = 'RESOLVED' THEN i.id END) as issues_resolved,
        COUNT(DISTINCT CASE WHEN i.urgency_score >= 8 THEN i.id END) as high_priority_issues,
        AVG(CASE WHEN i.status = 'RESOLVED' AND i.resolved_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (i.resolved_at - i.created_at))/3600 END) as avg_resolution_hours
      FROM issues i
      WHERE i.zone_id = $1 
        AND i.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(i.created_at)
      ORDER BY date DESC
    `, [zoneId]);
    
    return result.rows;
  },

  // Get available zones for public selection (used for issue creation)
  async getAvailableZones() {
    return await cacheService.cached('zones:available', async () => {
      const result = await query(`
        SELECT z.id, z.area_name, z.state, z.pincode, z.district,
               COUNT(DISTINCT sc.steward_id) as available_stewards,
               COUNT(DISTINCT sc.category_id) as managed_categories
        FROM zones z
        LEFT JOIN steward_categories sc ON z.id = sc.zone_id
        WHERE z.is_active = true
        GROUP BY z.id, z.area_name, z.state, z.pincode, z.district
        HAVING COUNT(DISTINCT sc.steward_id) > 0
        ORDER BY z.area_name
      `);
      
      return result.rows;
    }, 600); // Cache for 10 minutes
  },

  // Enhanced search zones with better filtering
  async searchZones(filters = {}) {
    const { query: searchQuery, state, pincode, limit = 20 } = filters;
    
    let whereConditions = ['z.is_active = true'];
    let queryParams = [];
    let paramCount = 0;
    
    if (searchQuery) {
      whereConditions.push(`(z.area_name ILIKE $${++paramCount} OR z.district ILIKE $${paramCount} OR z.pincode ILIKE $${paramCount})`);
      queryParams.push(`%${searchQuery}%`);
    }
    
    if (state) {
      whereConditions.push(`z.state ILIKE $${++paramCount}`);
      queryParams.push(`%${state}%`);
    }
    
    if (pincode) {
      whereConditions.push(`z.pincode = $${++paramCount}`);
      queryParams.push(pincode);
    }
    
    queryParams.push(parseInt(limit));
    
    const result = await query(`
      SELECT z.id, z.area_name, z.state, z.pincode, z.district,
             COUNT(DISTINCT sc.steward_id) as available_stewards,
             COUNT(DISTINCT sc.category_id) as managed_categories,
             COUNT(DISTINCT i.id) as total_issues
      FROM zones z
      LEFT JOIN steward_categories sc ON z.id = sc.zone_id
      LEFT JOIN issues i ON z.id = i.zone_id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY z.id, z.area_name, z.state, z.pincode, z.district
      ORDER BY z.area_name
      LIMIT $${paramCount + 1}
    `, queryParams);
    
    return result.rows;
  }
};

module.exports = adminZoneService;
