const { query, transaction } = require('../config/database');
const userService = require('./userService');
const cacheService = require('./redis/cacheService');

const stewardService = {
  // Submit steward application
  async submitApplication(userId, justification) {
    // Check if user already has an application
    const existingApp = await query(
      'SELECT * FROM steward_applications WHERE user_id = $1',
      [userId]
    );
    
    if (existingApp.rows.length > 0) {
      throw new Error('You have already submitted a steward application');
    }
    
    const result = await query(
      `INSERT INTO steward_applications (user_id, justification)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, justification]
    );
    
    return result.rows[0];
  },

  // Get user's application status
  async getMyApplication(userId) {
    const result = await query(
      `SELECT sa.*, u.full_name as reviewed_by_name
       FROM steward_applications sa
       LEFT JOIN users u ON sa.reviewed_by = u.id
       WHERE sa.user_id = $1`,
      [userId]
    );
    
    return result.rows[0] || null;
  },

  // Get pending steward applications (admin only)
  async getPendingApplications() {
    const result = await query(
      `SELECT sa.*, u.full_name, u.email, u.reputation_score,
              u.issues_reported, u.issues_resolved
       FROM steward_applications sa
       JOIN users u ON sa.user_id = u.id
       WHERE sa.status = 'PENDING'
       ORDER BY sa.created_at ASC`
    );
    
    return result.rows;
  },

  // Review steward application (admin only)
  async reviewApplication(applicationId, reviewerId, decision, feedback = null) {
    const result = await transaction(async (client) => {
      // Get application details
      const appResult = await client.query(
        'SELECT * FROM steward_applications WHERE id = $1',
        [applicationId]
      );
      
      if (appResult.rows.length === 0) {
        throw new Error('Application not found');
      }
      
      const application = appResult.rows[0];
      
      // Update application status
      await client.query(
        `UPDATE steward_applications 
         SET status = $1::application_status, reviewed_by = $2, reviewed_at = NOW()
         WHERE id = $3`,
        [decision, reviewerId, applicationId]
      );
      
      // If approved, update user role to STEWARD
      if (decision === 'APPROVED') {
        await client.query(
          'UPDATE users SET role = $1 WHERE id = $2',
          ['STEWARD', application.user_id]
        );
        
        // Clear user cache
        const cacheKey = cacheService.generateKey('user', application.user_id);
        await cacheService.del(cacheKey);
      }
      
      return application;
    });
    
    return result;
  },

  // Assign steward to category in a zone (admin only)
  async assignStewardToCategory(stewardId, categoryId, zoneId, adminId, notes = null) {
    const result = await transaction(async (client) => {
      // Verify steward exists and has STEWARD role
      const stewardCheck = await client.query(
        'SELECT id, full_name, role FROM users WHERE id = $1 AND role = $2 AND is_active = true',
        [stewardId, 'STEWARD']
      );
      
      if (stewardCheck.rows.length === 0) {
        throw new Error('Steward not found or invalid role');
      }
      
      // Verify category exists
      const categoryCheck = await client.query(
        'SELECT id, name FROM issue_categories WHERE id = $1',
        [categoryId]
      );
      
      if (categoryCheck.rows.length === 0) {
        throw new Error('Category not found');
      }
      
      // Verify zone exists
      const zoneCheck = await client.query(
        'SELECT id, name FROM zones WHERE id = $1 AND is_active = true',
        [zoneId]
      );
      
      if (zoneCheck.rows.length === 0) {
        throw new Error('Zone not found');
      }
      
      // Check if assignment already exists
      const existingAssignment = await client.query(
        'SELECT id FROM steward_categories WHERE steward_id = $1 AND category_id = $2 AND zone_id = $3 AND is_active = true',
        [stewardId, categoryId, zoneId]
      );
      
      if (existingAssignment.rows.length > 0) {
        throw new Error('Steward is already assigned to this category in this zone');
      }
      
      // Create assignment
      const assignmentResult = await client.query(
        `INSERT INTO steward_categories (steward_id, category_id, zone_id, assigned_by, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [stewardId, categoryId, zoneId, adminId, notes]
      );
      
      const assignment = assignmentResult.rows[0];
      assignment.steward_name = stewardCheck.rows[0].full_name;
      assignment.category_name = categoryCheck.rows[0].name;
      assignment.zone_name = zoneCheck.rows[0].name;
      
      return assignment;
    });
    
    return result;
  },

  // Remove steward from category-zone assignment (admin only)
  async removeStewardFromCategory(stewardId, categoryId, zoneId, adminId) {
    const result = await query(
      `UPDATE steward_categories 
       SET is_active = false, updated_at = NOW()
       WHERE steward_id = $1 AND category_id = $2 AND zone_id = $3 AND is_active = true
       RETURNING *`,
      [stewardId, categoryId, zoneId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Assignment not found or already inactive');
    }
    
    return result.rows[0];
  },

  // Get steward's assigned categories across all zones
  async getStewardCategories(stewardId) {
    const result = await query(`
      SELECT sc.*, 
             ic.name as category_name,
             ic.description as category_description,
             z.name as zone_name,
             z.area_name,
             z.pincode,
             z.type as zone_type,
             assignedBy.full_name as assigned_by_name,
             COUNT(i.id) as total_issues,
             COUNT(CASE WHEN i.status = 'OPEN' THEN 1 END) as open_issues,
             COUNT(CASE WHEN i.status = 'IN_PROGRESS' THEN 1 END) as in_progress_issues,
             COUNT(CASE WHEN i.status = 'RESOLVED' THEN 1 END) as resolved_issues
      FROM steward_categories sc
      JOIN issue_categories ic ON sc.category_id = ic.id
      JOIN zones z ON sc.zone_id = z.id
      LEFT JOIN users assignedBy ON sc.assigned_by = assignedBy.id
      LEFT JOIN issues i ON sc.category_id = i.category_id AND sc.zone_id = i.zone_id
      WHERE sc.steward_id = $1 AND sc.is_active = true
      GROUP BY sc.id, sc.steward_id, sc.category_id, sc.zone_id, sc.assigned_at, sc.notes,
               ic.name, ic.description, z.name, z.area_name, z.pincode, z.type, assignedBy.full_name
      ORDER BY z.name, ic.name
    `, [stewardId]);
    
    return result.rows;
  },

  // Get stewards assigned to a specific category in a zone
  async getCategoryStewards(categoryId, zoneId) {
    const result = await query(`
      SELECT u.id, u.full_name, u.email, u.reputation_score,
             sc.assigned_at, sc.notes,
             assignedBy.full_name as assigned_by_name,
             COUNT(DISTINCT ih.issue_id) as issues_handled,
             COUNT(DISTINCT CASE WHEN i.status = 'RESOLVED' THEN ih.issue_id END) as issues_resolved
      FROM steward_categories sc
      JOIN users u ON sc.steward_id = u.id
      LEFT JOIN users assignedBy ON sc.assigned_by = assignedBy.id
      LEFT JOIN issue_history ih ON u.id = ih.user_id AND ih.new_status != ih.old_status
      LEFT JOIN issues i ON ih.issue_id = i.id AND i.category_id = $1 AND i.zone_id = $2
      WHERE sc.category_id = $1 AND sc.zone_id = $2 AND sc.is_active = true
      GROUP BY u.id, u.full_name, u.email, u.reputation_score,
               sc.assigned_at, sc.notes, assignedBy.full_name
      ORDER BY u.full_name
    `, [categoryId, zoneId]);
    
    return result.rows;
  },

  // Get all stewards with their assignments (admin view)
  async getAllStewardsWithAssignments() {
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
  },

  // Get steward performance statistics
  async getStewardStats(stewardId) {
    const result = await query(`
      SELECT 
        u.id, u.full_name, u.reputation_score,
        COUNT(DISTINCT sc.id) as total_assignments,
        COUNT(DISTINCT sc.zone_id) as assigned_zones,
        COUNT(DISTINCT sc.category_id) as assigned_categories,
        COUNT(DISTINCT i.id) as total_issues_managed,
        COUNT(DISTINCT CASE WHEN i.status = 'RESOLVED' THEN i.id END) as issues_resolved,
        COUNT(DISTINCT CASE WHEN i.status = 'IN_PROGRESS' THEN i.id END) as issues_in_progress,
        COUNT(DISTINCT sn.id) as notes_added,
        AVG(CASE WHEN i.status = 'RESOLVED' AND i.resolved_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (i.resolved_at - i.created_at))/3600 END) as avg_resolution_hours,
        COUNT(DISTINCT CASE WHEN ih.created_at >= NOW() - INTERVAL '30 days' THEN ih.id END) as recent_activity
      FROM users u
      LEFT JOIN steward_categories sc ON u.id = sc.steward_id AND sc.is_active = true
      LEFT JOIN issues i ON sc.category_id = i.category_id AND sc.zone_id = i.zone_id
      LEFT JOIN issue_history ih ON u.id = ih.user_id AND ih.issue_id = i.id
      LEFT JOIN steward_notes sn ON u.id = sn.steward_id
      WHERE u.id = $1 AND u.role = 'STEWARD'
      GROUP BY u.id, u.full_name, u.reputation_score
    `, [stewardId]);
    
    if (result.rows.length === 0) {
      throw new Error('Steward not found');
    }
    
    const stats = result.rows[0];
    
    // Get detailed category assignments
    const assignments = await query(`
      SELECT sc.*, ic.name as category_name, z.name as zone_name, z.area_name,
             COUNT(i.id) as category_issues,
             COUNT(CASE WHEN i.status = 'OPEN' THEN 1 END) as open_issues,
             COUNT(CASE WHEN i.status = 'IN_PROGRESS' THEN 1 END) as in_progress_issues,
             COUNT(CASE WHEN i.status = 'RESOLVED' THEN 1 END) as resolved_issues
      FROM steward_categories sc
      JOIN issue_categories ic ON sc.category_id = ic.id
      JOIN zones z ON sc.zone_id = z.id
      LEFT JOIN issues i ON sc.category_id = i.category_id AND sc.zone_id = i.zone_id
      WHERE sc.steward_id = $1 AND sc.is_active = true
      GROUP BY sc.id, ic.name, z.name, z.area_name
      ORDER BY z.name, ic.name
    `, [stewardId]);
    
    stats.assignments = assignments.rows;
    
    return stats;
  },

  // Get steward's manageable issues
  async getStewardIssues(stewardId, filters = {}) {
    const { status, categoryId, zoneId, limit = 50, offset = 0 } = filters;
    
    let whereConditions = ['sc.steward_id = $1', 'sc.is_active = true'];
    let queryParams = [stewardId];
    let paramIndex = 2;
    
    if (status) {
      whereConditions.push(`i.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (categoryId) {
      whereConditions.push(`i.category_id = $${paramIndex}`);
      queryParams.push(categoryId);
      paramIndex++;
    }
    
    if (zoneId) {
      whereConditions.push(`i.zone_id = $${paramIndex}`);
      queryParams.push(zoneId);
      paramIndex++;
    }
    
    const result = await query(`
      SELECT DISTINCT i.*, 
             u.full_name as reporter_name,
             ic.name as category_name,
             z.name as zone_name,
             z.area_name,
             (SELECT COUNT(*) FROM comments WHERE issue_id = i.id) as comment_count,
             (SELECT COUNT(*) FROM issue_votes WHERE issue_id = i.id AND vote_type = 1) as upvote_count,
             (SELECT COUNT(*) FROM issue_votes WHERE issue_id = i.id AND vote_type = -1) as downvote_count
      FROM steward_categories sc
      JOIN issues i ON sc.category_id = i.category_id AND sc.zone_id = i.zone_id
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN issue_categories ic ON i.category_id = ic.id
      LEFT JOIN zones z ON i.zone_id = z.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY i.urgency_score DESC, i.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, limit, offset]);
    
    return result.rows;
  },

  // Add steward note to issue
  async addStewardNote(issueId, stewardId, note, isInternal = false, priority = null) {
    const result = await transaction(async (client) => {
      // Get issue details to verify category-zone access
      const issueResult = await client.query(
        'SELECT category_id, zone_id FROM issues WHERE id = $1',
        [issueId]
      );
      
      if (issueResult.rows.length === 0) {
        throw new Error('Issue not found');
      }
      
      const issue = issueResult.rows[0];
      
      // Check if steward has access to this category-zone combination
      const accessCheck = await client.query(
        `SELECT COUNT(*) as count FROM steward_categories 
         WHERE steward_id = $1 AND category_id = $2 AND zone_id = $3 AND is_active = true`,
        [stewardId, issue.category_id, issue.zone_id]
      );
      
      if (parseInt(accessCheck.rows[0].count) === 0) {
        throw new Error('Access denied: You are not assigned to manage this category in this zone');
      }
      
      // Add the note
      const noteResult = await client.query(
        `INSERT INTO steward_notes (issue_id, steward_id, note, is_internal, priority)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [issueId, stewardId, note, isInternal, priority]
      );
      
      return noteResult.rows[0];
    });
    
    return result;
  },

  // Get steward notes for an issue
  async getStewardNotes(issueId, includeInternal = false) {
    const internalClause = includeInternal ? '' : 'AND sn.is_internal = false';
    
    const result = await query(`
      SELECT sn.*, u.full_name as steward_name
      FROM steward_notes sn
      JOIN users u ON sn.steward_id = u.id
      WHERE sn.issue_id = $1 ${internalClause}
      ORDER BY sn.created_at DESC
    `, [issueId]);
    
    return result.rows;
  },

  // Get issues requiring steward attention
  async getIssuesRequiringAttention(stewardId, limit = 20) {
    const result = await query(`
      SELECT DISTINCT i.*, 
             ic.name as category_name,
             z.name as zone_name,
             z.area_name,
             (EXTRACT(EPOCH FROM (NOW() - i.created_at))/3600)::INTEGER as hours_old,
             CASE 
               WHEN i.vote_score >= 20 THEN 'high_votes'
               WHEN (NOW() - i.created_at) > INTERVAL '48 hours' THEN 'duration_exceeded'
               WHEN i.urgency_score >= 8 THEN 'high_urgency'
               ELSE 'standard'
             END as attention_reason
      FROM steward_categories sc
      JOIN issues i ON sc.category_id = i.category_id AND sc.zone_id = i.zone_id
      JOIN issue_categories ic ON i.category_id = ic.id
      JOIN zones z ON i.zone_id = z.id
      WHERE sc.steward_id = $1 
        AND sc.is_active = true
        AND i.status IN ('OPEN', 'ACKNOWLEDGED')
        AND (
          i.vote_score >= 20 OR 
          (NOW() - i.created_at) > INTERVAL '48 hours' OR 
          i.urgency_score >= 8
        )
      ORDER BY i.urgency_score DESC, i.vote_score DESC, i.created_at ASC
      LIMIT $2
    `, [stewardId, limit]);
    
    return result.rows;
  },

  // Bulk assign steward to multiple categories in a zone
  async bulkAssignStewardToCategories(stewardId, categoryIds, zoneId, adminId, notes = null) {
    const result = await transaction(async (client) => {
      // Verify steward, zone, and categories exist
      const [stewardCheck, zoneCheck, categoriesCheck] = await Promise.all([
        client.query('SELECT id, full_name FROM users WHERE id = $1 AND role = $2', [stewardId, 'STEWARD']),
        client.query('SELECT id, name FROM zones WHERE id = $1 AND is_active = true', [zoneId]),
        client.query('SELECT id, name FROM issue_categories WHERE id = ANY($1)', [categoryIds])
      ]);
      
      if (stewardCheck.rows.length === 0) throw new Error('Steward not found');
      if (zoneCheck.rows.length === 0) throw new Error('Zone not found');
      if (categoriesCheck.rows.length !== categoryIds.length) throw new Error('One or more categories not found');
      
      // Get existing assignments to avoid duplicates
      const existingAssignments = await client.query(
        'SELECT category_id FROM steward_categories WHERE steward_id = $1 AND zone_id = $2 AND category_id = ANY($3) AND is_active = true',
        [stewardId, zoneId, categoryIds]
      );
      
      const existingCategoryIds = existingAssignments.rows.map(row => row.category_id);
      const newCategoryIds = categoryIds.filter(id => !existingCategoryIds.includes(id));
      
      if (newCategoryIds.length === 0) {
        throw new Error('All categories are already assigned to this steward in this zone');
      }
      
      // Create new assignments
      const assignments = [];
      for (const categoryId of newCategoryIds) {
        const assignmentResult = await client.query(
          `INSERT INTO steward_categories (steward_id, category_id, zone_id, assigned_by, notes)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [stewardId, categoryId, zoneId, adminId, notes]
        );
        assignments.push(assignmentResult.rows[0]);
      }
      
      return {
        steward_name: stewardCheck.rows[0].full_name,
        zone_name: zoneCheck.rows[0].name,
        assignments,
        assigned_count: newCategoryIds.length,
        skipped_count: existingCategoryIds.length
      };
    });
    
    return result;
  },

  // Get steward workload summary
  async getStewardWorkload(stewardId) {
    const cacheKey = cacheService.generateKey('steward_workload', stewardId);
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT 
          COUNT(DISTINCT sc.id) as total_assignments,
          COUNT(DISTINCT sc.zone_id) as zones_count,
          COUNT(DISTINCT sc.category_id) as categories_count,
          COUNT(DISTINCT i.id) as total_manageable_issues,
          COUNT(DISTINCT CASE WHEN i.status = 'OPEN' THEN i.id END) as open_issues,
          COUNT(DISTINCT CASE WHEN i.status = 'IN_PROGRESS' THEN i.id END) as in_progress_issues,
          COUNT(DISTINCT CASE WHEN i.vote_score >= 20 THEN i.id END) as high_priority_issues,
          COUNT(DISTINCT CASE WHEN (NOW() - i.created_at) > INTERVAL '48 hours' AND i.status IN ('OPEN', 'ACKNOWLEDGED') THEN i.id END) as overdue_issues
        FROM steward_categories sc
        LEFT JOIN issues i ON sc.category_id = i.category_id AND sc.zone_id = i.zone_id
        WHERE sc.steward_id = $1 AND sc.is_active = true
      `, [stewardId]);
      
      return result.rows[0];
    }, 300); // Cache for 5 minutes
  },

  // Get steward's manageable issues
  async getStewardIssues(stewardId, filters = {}) {
    try {
      let whereClause = `
        WHERE i.category_id IN (
          SELECT sc.category_id 
          FROM steward_categories sc 
          WHERE sc.steward_id = $1
          ${filters.zoneId ? 'AND sc.zone_id = $' + (Object.keys(filters).filter(k => filters[k] !== undefined).length + 1) : ''}
        )
      `;
      
      const params = [stewardId];
      let paramIndex = 2;
      
      if (filters.zoneId) {
        params.push(filters.zoneId);
        paramIndex++;
      }
      
      if (filters.categoryId) {
        whereClause += ` AND i.category_id = $${paramIndex}`;
        params.push(filters.categoryId);
        paramIndex++;
      }
      
      if (filters.status) {
        whereClause += ` AND i.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }
      
      const query = `
        SELECT i.*, u.first_name, u.last_name, u.email,
               c.name as category_name, z.area_name as zone_name
        FROM issues i
        JOIN users u ON i.user_id = u.id
        JOIN categories c ON i.category_id = c.id
        JOIN zones z ON i.zone_id = z.id
        ${whereClause}
        ORDER BY 
          CASE 
            WHEN i.status = 'REPORTED' THEN 1
            WHEN i.status = 'IN_PROGRESS' THEN 2
            WHEN i.status = 'RESOLVED' THEN 3
            ELSE 4
          END,
          i.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(filters.limit || 50);
      params.push(filters.offset || 0);
      
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching steward issues: ${error.message}`);
    }
  },

  // Get issues requiring steward attention (urgent/overdue)
  async getIssuesRequiringAttention(stewardId, limit = 20) {
    try {
      const query = `
        SELECT i.*, u.first_name, u.last_name, u.email,
               c.name as category_name, z.area_name as zone_name,
               EXTRACT(EPOCH FROM (NOW() - i.created_at))/3600 as hours_old
        FROM issues i
        JOIN users u ON i.user_id = u.id
        JOIN categories c ON i.category_id = c.id
        JOIN zones z ON i.zone_id = z.id
        WHERE i.category_id IN (
          SELECT sc.category_id 
          FROM steward_categories sc 
          WHERE sc.steward_id = $1
        )
        AND (
          i.priority = 'HIGH' 
          OR i.status = 'REPORTED' 
          OR (i.status = 'IN_PROGRESS' AND i.updated_at < NOW() - INTERVAL '3 days')
        )
        ORDER BY 
          CASE i.priority 
            WHEN 'HIGH' THEN 1
            WHEN 'MEDIUM' THEN 2
            ELSE 3
          END,
          i.created_at ASC
        LIMIT $2
      `;
      
      const result = await db.query(query, [stewardId, limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching issues requiring attention: ${error.message}`);
    }
  },

  // Bulk assign steward to multiple categories in a zone
  async bulkAssignStewardToCategories(stewardId, categoryIds, zoneId, adminId, notes = null) {
    try {
      const client = await db.getClient();
      await client.query('BEGIN');
      
      try {
        // Remove existing assignments for this steward in this zone
        await client.query(
          'DELETE FROM steward_categories WHERE steward_id = $1 AND zone_id = $2',
          [stewardId, zoneId]
        );
        
        // Insert new assignments
        let assignedCount = 0;
        for (const categoryId of categoryIds) {
          const result = await client.query(
            `INSERT INTO steward_categories (steward_id, category_id, zone_id, assigned_by, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (steward_id, category_id, zone_id) DO UPDATE SET
               assigned_by = $4, notes = $5, updated_at = NOW()
             RETURNING id`,
            [stewardId, categoryId, zoneId, adminId, notes]
          );
          
          if (result.rows.length > 0) {
            assignedCount++;
          }
        }
        
        await client.query('COMMIT');
        
        return {
          steward_id: stewardId,
          zone_id: zoneId,
          assigned_count: assignedCount,
          category_ids: categoryIds
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      throw new Error(`Error bulk assigning steward to categories: ${error.message}`);
    }
  },

  // Get steward workload summary
  async getStewardWorkload(stewardId) {
    try {
      const query = `
        SELECT 
          sc.zone_id,
          z.area_name as zone_name,
          sc.category_id,
          c.name as category_name,
          COUNT(CASE WHEN i.status = 'REPORTED' THEN 1 END) as reported_issues,
          COUNT(CASE WHEN i.status = 'IN_PROGRESS' THEN 1 END) as in_progress_issues,
          COUNT(CASE WHEN i.status = 'RESOLVED' THEN 1 END) as resolved_issues,
          COUNT(i.id) as total_issues,
          AVG(CASE WHEN i.status = 'RESOLVED' THEN 
            EXTRACT(EPOCH FROM (i.updated_at - i.created_at))/3600 
          END) as avg_resolution_hours
        FROM steward_categories sc
        JOIN zones z ON sc.zone_id = z.id
        JOIN categories c ON sc.category_id = c.id
        LEFT JOIN issues i ON sc.category_id = i.category_id AND sc.zone_id = i.zone_id
        WHERE sc.steward_id = $1
        GROUP BY sc.zone_id, z.area_name, sc.category_id, c.name
        ORDER BY z.area_name, c.name
      `;
      
      const result = await db.query(query, [stewardId]);
      
      // Group by zone
      const workloadByZone = {};
      result.rows.forEach(row => {
        if (!workloadByZone[row.zone_id]) {
          workloadByZone[row.zone_id] = {
            zone_id: row.zone_id,
            zone_name: row.zone_name,
            categories: [],
            totals: {
              reported: 0,
              in_progress: 0,
              resolved: 0,
              total: 0
            }
          };
        }
        
        const categoryData = {
          category_id: row.category_id,
          category_name: row.category_name,
          reported_issues: parseInt(row.reported_issues),
          in_progress_issues: parseInt(row.in_progress_issues),
          resolved_issues: parseInt(row.resolved_issues),
          total_issues: parseInt(row.total_issues),
          avg_resolution_hours: row.avg_resolution_hours ? parseFloat(row.avg_resolution_hours) : null
        };
        
        workloadByZone[row.zone_id].categories.push(categoryData);
        workloadByZone[row.zone_id].totals.reported += categoryData.reported_issues;
        workloadByZone[row.zone_id].totals.in_progress += categoryData.in_progress_issues;
        workloadByZone[row.zone_id].totals.resolved += categoryData.resolved_issues;
        workloadByZone[row.zone_id].totals.total += categoryData.total_issues;
      });
      
      return Object.values(workloadByZone);
    } catch (error) {
      throw new Error(`Error fetching steward workload: ${error.message}`);
    }
  }
};

module.exports = stewardService;
