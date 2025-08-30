const { query, transaction } = require('../config/database');
const { AppError } = require('../middleware/errors');

const adminZoneService = {
  // Create new admin zone
  async createZone(name, description) {
    const result = await query(
      'INSERT INTO admin_zones (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    
    return result.rows[0];
  },

  // Get all zones
  async getAllZones() {
    const result = await query(
      `SELECT az.*, 
              COUNT(sza.user_id) as steward_count,
              COUNT(DISTINCT i.id) as total_issues,
              COUNT(DISTINCT CASE WHEN i.status IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS') THEN i.id END) as active_issues
       FROM admin_zones az
       LEFT JOIN steward_zone_assignments sza ON az.id = sza.zone_id
       LEFT JOIN issues i ON ST_DWithin(
         ST_SetSRID(ST_MakePoint(i.location_lng, i.location_lat), 4326),
         ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326), -- Example center point
         10000 -- 10km radius
       )
       GROUP BY az.id, az.name, az.description, az.created_at
       ORDER BY az.name`
    );
    
    return result.rows;
  },

  // Get zone by ID
  async getZoneById(zoneId) {
    const result = await query(
      'SELECT * FROM admin_zones WHERE id = $1',
      [zoneId]
    );
    
    return result.rows[0];
  },

  // Update zone
  async updateZone(zoneId, name, description) {
    const result = await query(
      'UPDATE admin_zones SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description, zoneId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Zone not found', 404);
    }
    
    return result.rows[0];
  },

  // Delete zone
  async deleteZone(zoneId) {
    const result = await query(
      'DELETE FROM admin_zones WHERE id = $1 RETURNING *',
      [zoneId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Zone not found', 404);
    }
    
    return result.rows[0];
  },

  // Get zone statistics
  async getZoneStats(zoneId) {
    const result = await query(
      `SELECT 
        COUNT(DISTINCT sza.user_id) as steward_count,
        COUNT(DISTINCT i.id) as total_issues,
        COUNT(DISTINCT CASE WHEN i.status = 'OPEN' THEN i.id END) as open_issues,
        COUNT(DISTINCT CASE WHEN i.status = 'IN_PROGRESS' THEN i.id END) as in_progress_issues,
        COUNT(DISTINCT CASE WHEN i.status = 'RESOLVED' THEN i.id END) as resolved_issues,
        AVG(i.vote_score) as avg_issue_score,
        COUNT(DISTINCT CASE WHEN i.created_at >= NOW() - INTERVAL '30 days' THEN i.id END) as issues_last_month
       FROM admin_zones az
       LEFT JOIN steward_zone_assignments sza ON az.id = sza.zone_id
       LEFT JOIN issues i ON ST_DWithin(
         ST_SetSRID(ST_MakePoint(i.location_lng, i.location_lat), 4326),
         ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326), -- Center point for zone
         10000 -- 10km radius
       )
       WHERE az.id = $1
       GROUP BY az.id`,
      [zoneId]
    );
    
    return result.rows[0] || {
      steward_count: 0,
      total_issues: 0,
      open_issues: 0,
      in_progress_issues: 0,
      resolved_issues: 0,
      avg_issue_score: 0,
      issues_last_month: 0
    };
  },

  // Get issues in zone
  async getZoneIssues(zoneId, filters = {}) {
    const { status, priority, limit = 50, offset = 0 } = filters;
    
    let whereClause = `WHERE ST_DWithin(
      ST_SetSRID(ST_MakePoint(i.location_lng, i.location_lat), 4326),
      ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326),
      10000
    )`;
    
    const params = [limit, offset];
    let paramIndex = 3;
    
    if (status) {
      whereClause += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    let orderClause = 'ORDER BY i.created_at DESC';
    if (priority === 'votes') {
      orderClause = 'ORDER BY i.vote_score DESC, i.created_at DESC';
    } else if (priority === 'urgent') {
      orderClause = 'ORDER BY i.vote_score DESC, i.created_at ASC';
    }
    
    const result = await query(
      `SELECT i.*, u.full_name as user_name, ic.name as category_name,
              COUNT(c.id) as comment_count
       FROM issues i
       LEFT JOIN users u ON i.user_id = u.id
       LEFT JOIN issue_categories ic ON i.category_id = ic.id
       LEFT JOIN comments c ON i.id = c.issue_id
       ${whereClause}
       GROUP BY i.id, u.full_name, ic.name
       ${orderClause}
       LIMIT $1 OFFSET $2`,
      params
    );
    
    return result.rows;
  },

  // Get stewards assigned to zone
  async getZoneStewards(zoneId) {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.reputation_score, u.created_at,
              COUNT(ih.id) as issues_handled,
              COUNT(sn.id) as notes_added
       FROM users u
       JOIN steward_zone_assignments sza ON u.id = sza.user_id
       LEFT JOIN issue_history ih ON u.id = ih.user_id AND ih.created_at >= NOW() - INTERVAL '30 days'
       LEFT JOIN steward_notes sn ON u.id = sn.steward_id AND sn.created_at >= NOW() - INTERVAL '30 days'
       WHERE sza.zone_id = $1 AND u.role = 'STEWARD'
       GROUP BY u.id, u.full_name, u.email, u.reputation_score, u.created_at
       ORDER BY u.reputation_score DESC`,
      [zoneId]
    );
    
    return result.rows;
  }
};

module.exports = adminZoneService;
