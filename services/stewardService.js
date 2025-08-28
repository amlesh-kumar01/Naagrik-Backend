const { query, transaction } = require('../config/database');

const stewardService = {
  // Submit steward application
  async submitApplication(userId, justification) {
    const result = await query(
      `INSERT INTO steward_applications (user_id, justification) 
       VALUES ($1, $2) 
       RETURNING *`,
      [userId, justification]
    );
    
    return result.rows[0];
  },

  // Get application by user ID
  async getApplicationByUserId(userId) {
    const result = await query(
      `SELECT sa.*, u.full_name, u.email, u.reputation_score,
              reviewer.full_name as reviewer_name
       FROM steward_applications sa
       LEFT JOIN users u ON sa.user_id = u.id
       LEFT JOIN users reviewer ON sa.reviewed_by = reviewer.id
       WHERE sa.user_id = $1`,
      [userId]
    );
    
    return result.rows[0] || null;
  },

  // Get all pending applications
  async getPendingApplications() {
    const result = await query(
      `SELECT sa.*, u.full_name, u.email, u.reputation_score
       FROM steward_applications sa
       LEFT JOIN users u ON sa.user_id = u.id
       WHERE sa.status = 'PENDING'
       ORDER BY sa.created_at ASC`
    );
    
    return result.rows;
  },

  // Review application
  async reviewApplication(applicationId, reviewerId, status, feedback = null) {
    const result = await transaction(async (client) => {
      // Update application
      const applicationResult = await client.query(
        `UPDATE steward_applications 
         SET status = $1, reviewed_by = $2, reviewed_at = NOW()
         WHERE id = $3 
         RETURNING *`,
        [status, reviewerId, applicationId]
      );
      
      if (applicationResult.rows.length === 0) {
        throw new Error('Application not found');
      }
      
      const application = applicationResult.rows[0];
      
      // If approved, update user role
      if (status === 'APPROVED') {
        await client.query(
          'UPDATE users SET role = $1 WHERE id = $2',
          ['STEWARD', application.user_id]
        );
      }
      
      return application;
    });
    
    return result;
  },

  // Get stewards in a zone
  async getStewardsInZone(zoneId) {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.reputation_score
       FROM users u
       JOIN steward_zone_assignments sza ON u.id = sza.user_id
       WHERE sza.zone_id = $1 AND u.role = 'STEWARD'
       ORDER BY u.reputation_score DESC`,
      [zoneId]
    );
    
    return result.rows;
  },

  // Assign steward to zone
  async assignStewardToZone(stewardId, zoneId) {
    const result = await query(
      `INSERT INTO steward_zone_assignments (user_id, zone_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, zone_id) DO NOTHING
       RETURNING *`,
      [stewardId, zoneId]
    );
    
    return result.rows[0];
  },

  // Remove steward from zone
  async removeStewardFromZone(stewardId, zoneId) {
    const result = await query(
      'DELETE FROM steward_zone_assignments WHERE user_id = $1 AND zone_id = $2 RETURNING *',
      [stewardId, zoneId]
    );
    
    return result.rows[0];
  },

  // Get steward's zones
  async getStewardZones(stewardId) {
    const result = await query(
      `SELECT az.* 
       FROM admin_zones az
       JOIN steward_zone_assignments sza ON az.id = sza.zone_id
       WHERE sza.user_id = $1
       ORDER BY az.name`,
      [stewardId]
    );
    
    return result.rows;
  },

  // Add steward note to issue
  async addStewardNote(issueId, stewardId, note) {
    const result = await query(
      'INSERT INTO steward_notes (issue_id, steward_id, note) VALUES ($1, $2, $3) RETURNING *',
      [issueId, stewardId, note]
    );
    
    return result.rows[0];
  },

  // Get steward notes for issue
  async getStewardNotes(issueId) {
    const result = await query(
      `SELECT sn.*, u.full_name as steward_name
       FROM steward_notes sn
       LEFT JOIN users u ON sn.steward_id = u.id
       WHERE sn.issue_id = $1
       ORDER BY sn.created_at DESC`,
      [issueId]
    );
    
    return result.rows;
  },

  // Get all stewards
  async getAllStewards() {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.reputation_score, u.created_at,
              COUNT(sza.zone_id) as assigned_zones
       FROM users u
       LEFT JOIN steward_zone_assignments sza ON u.id = sza.user_id
       WHERE u.role = 'STEWARD'
       GROUP BY u.id, u.full_name, u.email, u.reputation_score, u.created_at
       ORDER BY u.reputation_score DESC`
    );
    
    return result.rows;
  },

  // Get steward performance stats
  async getStewardStats(stewardId) {
    const result = await query(
      `SELECT 
        COUNT(DISTINCT ih.issue_id) as issues_handled,
        COUNT(sn.id) as notes_added,
        COUNT(DISTINCT CASE WHEN ih.new_status = 'RESOLVED' THEN ih.issue_id END) as issues_resolved
       FROM users u
       LEFT JOIN issue_history ih ON u.id = ih.user_id
       LEFT JOIN steward_notes sn ON u.id = sn.steward_id
       WHERE u.id = $1 AND u.role = 'STEWARD'`,
      [stewardId]
    );
    
    return result.rows[0] || { issues_handled: 0, notes_added: 0, issues_resolved: 0 };
  }
};

module.exports = stewardService;
