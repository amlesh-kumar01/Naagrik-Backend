const { query } = require('../config/database');
const cacheService = require('./redis/cacheService');

const dashboardService = {
  // Get overall system statistics
  async getSystemStats() {
    const cacheKey = cacheService.generateKey('system_stats');
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE role = 'CITIZEN') as total_citizens,
          (SELECT COUNT(*) FROM users WHERE role = 'STEWARD') as total_stewards,
          (SELECT COUNT(*) FROM users WHERE role = 'SUPER_ADMIN') as total_admins,
          (SELECT COUNT(*) FROM issues) as total_issues,
          (SELECT COUNT(*) FROM issues WHERE status = 'OPEN') as open_issues,
          (SELECT COUNT(*) FROM issues WHERE status = 'IN_PROGRESS') as in_progress_issues,
          (SELECT COUNT(*) FROM issues WHERE status = 'RESOLVED') as resolved_issues,
          (SELECT COUNT(*) FROM issues WHERE created_at >= NOW() - INTERVAL '24 hours') as issues_today,
          (SELECT COUNT(*) FROM issues WHERE created_at >= NOW() - INTERVAL '7 days') as issues_this_week,
          (SELECT COUNT(*) FROM issues WHERE created_at >= NOW() - INTERVAL '30 days') as issues_this_month,
          (SELECT COUNT(*) FROM comments) as total_comments,
          (SELECT COUNT(*) FROM steward_applications WHERE status = 'PENDING') as pending_applications,
          (SELECT COALESCE(AVG(vote_score), 0) FROM issues) as avg_issue_score,
          (SELECT COUNT(*) FROM user_badges) as total_badges_earned
      `);
      
      return result.rows[0];
    }, 300); // Cache for 5 minutes
  },

  // Get issue trends over time
  async getIssueTrends(days = 30) {
    const cacheKey = cacheService.generateKey('issue_trends', days);
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_issues,
          COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved_issues,
          AVG(vote_score) as avg_score
        FROM issues
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);
      
      return result.rows;
    }, 600); // Cache for 10 minutes
  },

  // Get top issues by votes
  async getTopIssues(limit = 10) {
    const cacheKey = cacheService.generateKey('top_issues', limit);
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT i.id, i.title, i.vote_score, i.status, i.created_at,
               u.full_name as user_name, ic.name as category_name,
               COUNT(c.id) as comment_count
        FROM issues i
        LEFT JOIN users u ON i.user_id = u.id
        LEFT JOIN issue_categories ic ON i.category_id = ic.id
        LEFT JOIN comments c ON i.id = c.issue_id
        WHERE i.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY i.id, u.full_name, ic.name
        ORDER BY i.vote_score DESC, i.created_at DESC
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    }, 300);
  },

  // Get user activity statistics
  async getUserActivityStats() {
    const cacheKey = cacheService.generateKey('user_activity_stats');
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT 
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as users_today,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as users_this_week,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as users_this_month,
          (SELECT COUNT(DISTINCT user_id) FROM issues WHERE created_at >= NOW() - INTERVAL '30 days') as active_reporters,
          (SELECT COUNT(DISTINCT user_id) FROM comments WHERE created_at >= NOW() - INTERVAL '30 days') as active_commenters,
          (SELECT COUNT(DISTINCT user_id) FROM issue_votes WHERE created_at >= NOW() - INTERVAL '30 days') as active_voters
        FROM users
      `);
      
      return result.rows[0];
    }, 600);
  },

  // Get steward performance metrics
  async getStewardPerformance(limit = 10) {
    const cacheKey = cacheService.generateKey('steward_performance', limit);
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT 
          u.id, u.full_name, u.reputation_score,
          COUNT(DISTINCT ih.issue_id) as issues_handled,
          COUNT(DISTINCT sn.id) as notes_added,
          COUNT(DISTINCT CASE WHEN ih.new_status = 'RESOLVED' THEN ih.issue_id END) as issues_resolved,
          COUNT(DISTINCT sza.zone_id) as zones_assigned,
          COALESCE(AVG(CASE WHEN ih.created_at >= NOW() - INTERVAL '30 days' THEN 1 END), 0) as activity_score
        FROM users u
        LEFT JOIN issue_history ih ON u.id = ih.user_id
        LEFT JOIN steward_notes sn ON u.id = sn.steward_id
        LEFT JOIN steward_zone_assignments sza ON u.id = sza.user_id
        WHERE u.role = 'STEWARD'
        GROUP BY u.id, u.full_name, u.reputation_score
        ORDER BY activity_score DESC, u.reputation_score DESC
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    }, 600);
  },

  // Get issue categories statistics
  async getCategoryStats() {
    const cacheKey = cacheService.generateKey('category_stats');
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT 
          ic.id, ic.name,
          COUNT(i.id) as total_issues,
          COUNT(CASE WHEN i.status = 'OPEN' THEN 1 END) as open_issues,
          COUNT(CASE WHEN i.status = 'RESOLVED' THEN 1 END) as resolved_issues,
          AVG(i.vote_score) as avg_score,
          COUNT(CASE WHEN i.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_issues
        FROM issue_categories ic
        LEFT JOIN issues i ON ic.id = i.category_id
        GROUP BY ic.id, ic.name
        ORDER BY total_issues DESC
      `);
      
      return result.rows;
    }, 600);
  },

  // Get geographic distribution of issues
  async getIssueDistribution(limit = 50) {
    const cacheKey = cacheService.generateKey('issue_distribution', limit);
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT 
          location_lat as lat,
          location_lng as lng,
          COUNT(*) as issue_count,
          AVG(vote_score) as avg_score,
          status
        FROM issues
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY location_lat, location_lng, status
        ORDER BY issue_count DESC
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    }, 600);
  },

  // Get resolution time analytics
  async getResolutionTimeStats() {
    const cacheKey = cacheService.generateKey('resolution_time_stats');
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours,
          MIN(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as min_resolution_hours,
          MAX(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as max_resolution_hours,
          COUNT(*) as total_resolved,
          COUNT(CASE WHEN resolved_at - created_at <= INTERVAL '24 hours' THEN 1 END) as resolved_within_24h,
          COUNT(CASE WHEN resolved_at - created_at <= INTERVAL '7 days' THEN 1 END) as resolved_within_week
        FROM issues
        WHERE status = 'RESOLVED' AND resolved_at IS NOT NULL
      `);
      
      return result.rows[0] || {
        avg_resolution_hours: 0,
        min_resolution_hours: 0,
        max_resolution_hours: 0,
        total_resolved: 0,
        resolved_within_24h: 0,
        resolved_within_week: 0
      };
    }, 900); // Cache for 15 minutes
  },

  // Get steward workload for specific steward
  async getStewardWorkload(stewardId) {
    const cacheKey = cacheService.generateKey('steward_workload', stewardId);
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT 
          COUNT(DISTINCT sza.zone_id) as assigned_zones,
          COUNT(DISTINCT i.id) as zone_issues,
          COUNT(DISTINCT CASE WHEN i.status IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS') THEN i.id END) as active_issues,
          COUNT(DISTINCT sn.id) as notes_added,
          COUNT(DISTINCT ih.issue_id) as issues_handled,
          AVG(i.vote_score) as avg_issue_priority
        FROM users u
        LEFT JOIN steward_zone_assignments sza ON u.id = sza.user_id
        LEFT JOIN issues i ON ST_DWithin(
          ST_SetSRID(ST_MakePoint(i.location_lng, i.location_lat), 4326),
          ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326),
          10000
        )
        LEFT JOIN steward_notes sn ON u.id = sn.steward_id AND sn.created_at >= NOW() - INTERVAL '30 days'
        LEFT JOIN issue_history ih ON u.id = ih.user_id AND ih.created_at >= NOW() - INTERVAL '30 days'
        WHERE u.id = $1 AND u.role = 'STEWARD'
        GROUP BY u.id
      `, [stewardId]);
      
      return result.rows[0] || {
        assigned_zones: 0,
        zone_issues: 0,
        active_issues: 0,
        notes_added: 0,
        issues_handled: 0,
        avg_issue_priority: 0
      };
    }, 300);
  },

  // Get critical issues requiring attention
  async getCriticalIssues(stewardId = null) {
    const cacheKey = cacheService.generateKey('critical_issues', stewardId || 'all');
    
    return await cacheService.cached(cacheKey, async () => {
      let query_text = `
        SELECT i.id, i.title, i.description, i.vote_score, i.status, i.created_at,
               i.location_lat, i.location_lng, i.address,
               u.full_name as user_name, ic.name as category_name,
               COUNT(c.id) as comment_count,
               EXTRACT(EPOCH FROM (NOW() - i.created_at))/3600 as hours_old
        FROM issues i
        LEFT JOIN users u ON i.user_id = u.id
        LEFT JOIN issue_categories ic ON i.category_id = ic.id
        LEFT JOIN comments c ON i.id = c.issue_id
      `;
      
      const params = [];
      let whereClause = `WHERE i.status IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS')`;
      
      if (stewardId) {
        query_text += `
        INNER JOIN steward_zone_assignments sza ON ST_DWithin(
          ST_SetSRID(ST_MakePoint(i.location_lng, i.location_lat), 4326),
          ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326),
          10000
        )`;
        whereClause += ` AND sza.user_id = $1`;
        params.push(stewardId);
      }
      
      query_text += `
        ${whereClause}
        GROUP BY i.id, u.full_name, ic.name
        HAVING (i.vote_score >= 10 OR EXTRACT(EPOCH FROM (NOW() - i.created_at))/3600 >= 48)
        ORDER BY i.vote_score DESC, i.created_at ASC
        LIMIT 20
      `;
      
      const result = await query(query_text, params);
      return result.rows;
    }, 300);
  }
};

module.exports = dashboardService;
