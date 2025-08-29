const { query, transaction } = require('../config/database');
const { getPagination, getPaginationInfo } = require('../utils/helpers');
const userService = require('./userService');
const mediaService = require('./mediaService');

const issueService = {
  // Create a new issue
  async createIssue(issueData, userId) {
    const { 
      title, 
      description, 
      categoryId, 
      locationLat, 
      locationLng, 
      address,
    } = issueData;
    
    // Validate required fields
    if (!title || !description || !categoryId) {
      throw new Error('Title, description, and category are required');
    }
    
    const result = await transaction(async (client) => {
      // Create the issue
      const issueResult = await client.query(
        `INSERT INTO issues (
          user_id, category_id, title, description, 
          location_lat, location_lng, address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING *`,
        [userId, categoryId, title, description, locationLat, locationLng, address]
      );
      
      const issue = issueResult.rows[0];
      // Update user reputation
      await client.query(
        'UPDATE users SET reputation_score = reputation_score + 5 WHERE id = $1',
        [userId]
      );
      
      return issue;
    });
    
    return result;
  },

  // Get issue by ID with full details
  async getIssueById(issueId, includeComments = true) {
    const issueResult = await query(
      `SELECT 
        i.*,
        u.full_name as user_name,
        u.reputation_score as user_reputation,
        ic.name as category_name,
        pi.title as primary_issue_title,
        thumbnail.media_url as thumbnail_url
       FROM issues i
       LEFT JOIN users u ON i.user_id = u.id
       LEFT JOIN issue_categories ic ON i.category_id = ic.id
       LEFT JOIN issues pi ON i.primary_issue_id = pi.id
       LEFT JOIN issue_media thumbnail ON i.id = thumbnail.issue_id AND thumbnail.is_thumbnail = true
       WHERE i.id = $1`,
      [issueId]
    );
    
    if (issueResult.rows.length === 0) return null;
    
    const issue = issueResult.rows[0];
    
    // Get media files using mediaService
    issue.media = await mediaService.getIssueMedia(issueId);
    
    if (includeComments) {
      const commentsResult = await query(
        `SELECT 
          c.*,
          u.full_name as user_name,
          u.reputation_score as user_reputation
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.issue_id = $1
         ORDER BY c.created_at DESC`,
        [issueId]
      );
      
      issue.comments = commentsResult.rows;
    }
    
    // Get steward notes if available
    const notesResult = await query(
      `SELECT 
        sn.*,
        u.full_name as steward_name
       FROM steward_notes sn
       LEFT JOIN users u ON sn.steward_id = u.id
       WHERE sn.issue_id = $1
       ORDER BY sn.created_at DESC`,
      [issueId]
    );
    
    issue.steward_notes = notesResult.rows;
    
    return issue;
  },

  // Get issues with filters and pagination
  async getIssues(filters = {}, page = 1, limit = 10) {
    const { offset, limit: limitInt } = getPagination(page, limit);
    const {
      status,
      categoryId,
      userId,
      search,
      nearLat,
      nearLng,
      radius = 50 // km
    } = filters;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
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
    
    if (userId) {
      whereConditions.push(`i.user_id = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(i.title ILIKE $${paramIndex} OR i.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    // Location-based filtering (if coordinates provided)
    let distanceSelect = '';
    if (nearLat && nearLng) {
      distanceSelect = `, 
        (6371 * acos(cos(radians($${paramIndex})) * cos(radians(i.location_lat)) * 
        cos(radians(i.location_lng) - radians($${paramIndex + 1})) + 
        sin(radians($${paramIndex})) * sin(radians(i.location_lat)))) AS distance`;
      
      whereConditions.push(`
        (6371 * acos(cos(radians($${paramIndex})) * cos(radians(i.location_lat)) * 
        cos(radians(i.location_lng) - radians($${paramIndex + 1})) + 
        sin(radians($${paramIndex})) * sin(radians(i.location_lat)))) <= $${paramIndex + 2}
      `);
      
      queryParams.push(nearLat, nearLng, radius);
      paramIndex += 3;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const orderBy = nearLat && nearLng ? 'ORDER BY distance ASC, i.created_at DESC' : 'ORDER BY i.created_at DESC';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM issues i
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].total);
    
    // Get issues
    const issuesQuery = `
      SELECT 
        i.*,
        u.full_name as user_name,
        u.reputation_score as user_reputation,
        ic.name as category_name,
        (SELECT COUNT(*) FROM comments WHERE issue_id = i.id) as comment_count,
        (SELECT COUNT(*) FROM issue_votes WHERE issue_id = i.id AND vote_type = 1) as upvote_count,
        (SELECT COUNT(*) FROM issue_votes WHERE issue_id = i.id AND vote_type = -1) as downvote_count,
        (SELECT COUNT(*) FROM issue_media WHERE issue_id = i.id AND moderation_status != 'REJECTED') as media_count,
        (SELECT media_url FROM issue_media WHERE issue_id = i.id AND is_thumbnail = true AND moderation_status != 'REJECTED' LIMIT 1) as thumbnail_url,
        (SELECT media_url FROM issue_media WHERE issue_id = i.id AND moderation_status != 'REJECTED' ORDER BY created_at ASC LIMIT 1) as first_media_url,
        (SELECT media_type FROM issue_media WHERE issue_id = i.id AND moderation_status != 'REJECTED' ORDER BY created_at ASC LIMIT 1) as first_media_type
        ${distanceSelect}
      FROM issues i
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN issue_categories ic ON i.category_id = ic.id
      ${whereClause}
      ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limitInt, offset);
    
    const issuesResult = await query(issuesQuery, queryParams);
    
    // Optionally include media previews for list view
    const issuesWithMedia = issuesResult.rows.map(issue => ({
      ...issue,
      has_media: issue.media_count > 0,
      preview_media: {
        thumbnail: issue.thumbnail_url,
        first_media: issue.first_media_url,
        first_media_type: issue.first_media_type,
        total_count: parseInt(issue.media_count)
      }
    }));

    return {
      issues: issuesWithMedia,
      pagination: getPaginationInfo(page, limitInt, totalCount)
    };
  },

  // Update issue status
  async updateIssueStatus(issueId, newStatus, userId, reason = null) {
    const result = await transaction(async (client) => {
      // Get current issue
      const currentIssueResult = await client.query(
        'SELECT * FROM issues WHERE id = $1',
        [issueId]
      );
      
      if (currentIssueResult.rows.length === 0) {
        throw new Error('Issue not found');
      }
      
      const currentIssue = currentIssueResult.rows[0];
      
      // Update issue status
      const updateResult = await client.query(
        `UPDATE issues 
         SET status = $1::issue_status, updated_at = NOW(), resolved_at = CASE WHEN $1::issue_status = 'RESOLVED' THEN NOW() ELSE resolved_at END
         WHERE id = $2 
         RETURNING *`,
        [newStatus, issueId]
      );
      
      // Record in history
      await client.query(
        `INSERT INTO issue_history (issue_id, user_id, old_status, new_status, change_reason)
         VALUES ($1, $2, $3::issue_status, $4::issue_status, $5)`,
        [issueId, userId, currentIssue.status, newStatus, reason]
      );
      
      // Update reputation if issue is resolved
      if (newStatus === 'RESOLVED' && currentIssue.user_id) {
        await client.query(
          'UPDATE users SET reputation_score = reputation_score + 10 WHERE id = $1',
          [currentIssue.user_id]
        );
      }
      
      return updateResult.rows[0];
    });
    
    return result;
  },

  // Mark issue as duplicate
  async markAsDuplicate(issueId, primaryIssueId, userId, reason = null) {
    const result = await transaction(async (client) => {
      // Verify both issues exist
      const issuesResult = await client.query(
        'SELECT id, status FROM issues WHERE id IN ($1, $2)',
        [issueId, primaryIssueId]
      );
      
      if (issuesResult.rows.length !== 2) {
        throw new Error('One or both issues not found');
      }
      
      // Update the duplicate issue
      const updateResult = await client.query(
        `UPDATE issues 
         SET status = 'DUPLICATE', primary_issue_id = $1, updated_at = NOW()
         WHERE id = $2 
         RETURNING *`,
        [primaryIssueId, issueId]
      );
      
      // Record in history
      await client.query(
        `INSERT INTO issue_history (issue_id, user_id, old_status, new_status, change_reason)
         VALUES ($1, $2, $3, 'DUPLICATE', $4)`,
        [issueId, userId, updateResult.rows[0].status, reason]
      );
      
      // Give reputation to the user who reported the duplicate
      await client.query(
        'UPDATE users SET reputation_score = reputation_score + 3 WHERE id = $1',
        [userId]
      );
      
      return updateResult.rows[0];
    });
    
    return result;
  },

  // Vote on an issue
  async voteIssue(issueId, userId, voteType) {
    const result = await transaction(async (client) => {
      // Check if user already voted
      const existingVoteResult = await client.query(
        'SELECT vote_type FROM issue_votes WHERE issue_id = $1 AND user_id = $2',
        [issueId, userId]
      );
      
      let reputationChange = 0;
      
      if (existingVoteResult.rows.length > 0) {
        const existingVote = existingVoteResult.rows[0];
        
        if (existingVote.vote_type === voteType) {
          // Remove vote if same vote type
          await client.query(
            'DELETE FROM issue_votes WHERE issue_id = $1 AND user_id = $2',
            [issueId, userId]
          );
          reputationChange = voteType === 1 ? -2 : 1; // Reverse the reputation change
        } else {
          // Update vote type
          await client.query(
            'UPDATE issue_votes SET vote_type = $1 WHERE issue_id = $2 AND user_id = $3',
            [voteType, issueId, userId]
          );
          reputationChange = voteType === 1 ? 3 : -3; // Change from down to up or vice versa
        }
      } else {
        // Insert new vote
        await client.query(
          'INSERT INTO issue_votes (issue_id, user_id, vote_type) VALUES ($1, $2, $3)',
          [issueId, userId, voteType]
        );
        reputationChange = voteType === 1 ? 2 : -1;
      }
      
      // Update vote score
      const voteScoreResult = await client.query(
        `UPDATE issues 
         SET vote_score = (
           SELECT COALESCE(SUM(vote_type), 0) 
           FROM issue_votes 
           WHERE issue_id = $1
         )
         WHERE id = $1
         RETURNING vote_score`,
        [issueId]
      );
      
      // Update issue creator's reputation
      if (reputationChange !== 0) {
        await client.query(
          `UPDATE users 
           SET reputation_score = reputation_score + $1 
           WHERE id = (SELECT user_id FROM issues WHERE id = $2)`,
          [reputationChange, issueId]
        );
      }
      
      return { voteScore: voteScoreResult.rows[0].vote_score, reputationChange };
    });
    
    return result;
  },

  // Get issue categories
  async getCategories() {
    const result = await query(
      'SELECT * FROM issue_categories ORDER BY name'
    );
    
    return result.rows;
  },

  // Get issue history
  async getIssueHistory(issueId) {
    const result = await query(
      `SELECT 
        ih.*,
        u.full_name as user_name
       FROM issue_history ih
       LEFT JOIN users u ON ih.user_id = u.id
       WHERE ih.issue_id = $1
       ORDER BY ih.created_at DESC`,
      [issueId]
    );
    
    return result.rows;
  },

  // Get all issue categories
  async getCategories() {
    const result = await query(
      'SELECT id, name, description FROM issue_categories ORDER BY name',
      []
    );
    
    return result.rows;
  },

  // Delete issue (soft delete by setting status to ARCHIVED)
  async deleteIssue(issueId, userId) {
    return await this.updateIssueStatus(issueId, 'ARCHIVED', userId, 'Issue deleted');
  },

  // Add media to an existing issue
  async addMediaToIssue(issueId, userId, mediaUrl, mediaType, isThumbnail = false) {
    return await mediaService.addMediaToIssue(issueId, userId, mediaUrl, mediaType, isThumbnail);
  },

  // Bulk add media to an existing issue
  async addMultipleMediaToIssue(issueId, userId, mediaUrls) {
    // Verify issue exists and user has permission
    const issue = await this.getIssueById(issueId, false);
    if (!issue) {
      throw new Error('Issue not found');
    }
    
    if (issue.user_id !== userId) {
      throw new Error('You can only add media to your own issues');
    }

    return await mediaService.createMultipleMediaRecords(issueId, userId, mediaUrls);
  },

  // Update thumbnail for an issue
  async updateIssueThumbnail(issueId, newThumbnailUrl, userId) {
    return await mediaService.updateIssueThumbnail(issueId, newThumbnailUrl, userId);
  },

  // Set existing media as thumbnail
  async setMediaAsThumbnail(issueId, mediaId, userId) {
    return await mediaService.setIssueThumbnail(issueId, mediaId, userId);
  },

  // Remove media from issue
  async removeMediaFromIssue(mediaId, userId) {
    return await mediaService.removeMediaFromIssue(mediaId, userId);
  },

  // Get all media for an issue
  async getIssueMedia(issueId) {
    return await mediaService.getIssueMedia(issueId);
  }
};

module.exports = issueService;
