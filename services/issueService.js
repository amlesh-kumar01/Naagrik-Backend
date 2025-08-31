const { query, transaction } = require('../config/database');
const { getPagination, getPaginationInfo } = require('../utils/helpers');
const userService = require('./userService');
const mediaService = require('./mediaService');
const cacheService = require('./redis/cacheService');

const issueService = {
  // Create a new issue
  async createIssue(issueData, userId) {
    const { 
      title, 
      description, 
      categoryId,
      zoneId, // NEW: Required zone selection
      locationLat, 
      locationLng, 
      address,
    } = issueData;
    
    // Validate required fields
    if (!title || !description || !categoryId || !zoneId) {
      throw new Error('Title, description, category, and zone are required');
    }
    
    // Verify zone exists
    const zoneResult = await query('SELECT id FROM zones WHERE id = $1 AND is_active = true', [zoneId]);
    if (zoneResult.rows.length === 0) {
      throw new Error('Invalid zone selected');
    }
    
    const result = await transaction(async (client) => {
      // Create the issue with zone_id
      const issueResult = await client.query(
        `INSERT INTO issues (
          user_id, category_id, zone_id, title, description, 
          location_lat, location_lng, address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *`,
        [userId, categoryId, zoneId, title, description, locationLat, locationLng, address]
      );
      
      const issue = issueResult.rows[0];
      
      // Update user reputation and issue count
      await client.query(
        'UPDATE users SET reputation_score = reputation_score + 5, issues_reported = issues_reported + 1 WHERE id = $1',
        [userId]
      );
      
      return issue;
    });
    
    return result;
  },

  // Get issue by ID with full details
  async getIssueById(issueId, includeComments = true, currentUserId = null) {
    let voteSelectClause = '';
    let queryParams = [issueId];
    
    if (currentUserId) {
      voteSelectClause = `, 
        (SELECT vote_type FROM issue_votes WHERE issue_id = i.id AND user_id = $2) as user_vote_type,
        CASE WHEN (SELECT vote_type FROM issue_votes WHERE issue_id = i.id AND user_id = $3) IS NOT NULL THEN true ELSE false END as user_has_voted,
        (SELECT COUNT(*) FROM issue_votes WHERE issue_id = i.id AND vote_type = 1) as upvote_count,
        (SELECT COUNT(*) FROM issue_votes WHERE issue_id = i.id AND vote_type = -1) as downvote_count`;
      queryParams = [issueId, currentUserId, currentUserId];
    } else {
      voteSelectClause = `, 
        NULL as user_vote_type,
        false as user_has_voted,
        (SELECT COUNT(*) FROM issue_votes WHERE issue_id = i.id AND vote_type = 1) as upvote_count,
        (SELECT COUNT(*) FROM issue_votes WHERE issue_id = i.id AND vote_type = -1) as downvote_count`;
    }
    
    const issueResult = await query(
      `SELECT 
        i.*,
        u.full_name as user_name,
        u.reputation_score as user_reputation,
        ic.name as category_name,
        pi.title as primary_issue_title,
        thumbnail.media_url as thumbnail_url
        ${voteSelectClause}
       FROM issues i
       LEFT JOIN users u ON i.user_id = u.id
       LEFT JOIN issue_categories ic ON i.category_id = ic.id
       LEFT JOIN issues pi ON i.primary_issue_id = pi.id
       LEFT JOIN issue_media thumbnail ON i.id = thumbnail.issue_id AND thumbnail.is_thumbnail = true
       WHERE i.id = $1`,
      queryParams
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
    
    // Add user vote status to the issue
    if (currentUserId) {
      issue.user_vote_status = {
        hasVoted: issue.user_has_voted,
        voteType: issue.user_vote_type || null,
        voteTypeText: issue.user_vote_type === 1 ? 'upvote' : 
                     issue.user_vote_type === -1 ? 'downvote' : null
      };
    } else {
      issue.user_vote_status = null;
    }
    
    return issue;
  },

  // Get issues with filters and pagination
  async getIssues(filters = {}, page = 1, limit = 10, currentUserId = null) {
    const { offset, limit: limitInt } = getPagination(page, limit);
    const {
      status,
      categoryId,
      zoneId, // NEW: Zone filtering
      userId,
      search
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
    
    // NEW: Zone filtering
    if (zoneId) {
      whereConditions.push(`i.zone_id = $${paramIndex}`);
      queryParams.push(zoneId);
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
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM issues i
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].total);
    
    // Add vote parameters for main query
    let voteSelectClause = '';
    let mainQueryParams = [...queryParams];
    let voteParamIndex = paramIndex;
    
    if (currentUserId) {
      voteSelectClause = `, 
        (SELECT vote_type FROM issue_votes WHERE issue_id = i.id AND user_id = $${voteParamIndex}) as user_vote_type,
        CASE WHEN (SELECT vote_type FROM issue_votes WHERE issue_id = i.id AND user_id = $${voteParamIndex + 1}) IS NOT NULL THEN true ELSE false END as user_has_voted`;
      mainQueryParams.push(currentUserId, currentUserId);
      voteParamIndex += 2;
    } else {
      voteSelectClause = ', NULL as user_vote_type, false as user_has_voted';
    }
    
    const issuesQuery = `
      SELECT 
        i.*,
        u.full_name as user_name,
        u.reputation_score as user_reputation,
        ic.name as category_name,
        z.name as zone_name,
        z.area_name,
        z.pincode,
        z.type as zone_type,
        (SELECT COUNT(*) FROM comments WHERE issue_id = i.id) as comment_count,
        (SELECT COUNT(*) FROM issue_votes WHERE issue_id = i.id AND vote_type = 1) as upvote_count,
        (SELECT COUNT(*) FROM issue_votes WHERE issue_id = i.id AND vote_type = -1) as downvote_count,
        (SELECT COUNT(*) FROM issue_media WHERE issue_id = i.id AND moderation_status != 'REJECTED') as media_count,
        (SELECT media_url FROM issue_media WHERE issue_id = i.id AND is_thumbnail = true AND moderation_status != 'REJECTED' LIMIT 1) as thumbnail_url,
        (SELECT media_url FROM issue_media WHERE issue_id = i.id AND moderation_status != 'REJECTED' ORDER BY created_at ASC LIMIT 1) as first_media_url,
        (SELECT media_type FROM issue_media WHERE issue_id = i.id AND moderation_status != 'REJECTED' ORDER BY created_at ASC LIMIT 1) as first_media_type
        ${voteSelectClause}
      FROM issues i
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN issue_categories ic ON i.category_id = ic.id
      LEFT JOIN zones z ON i.zone_id = z.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT $${voteParamIndex} OFFSET $${voteParamIndex + 1}
    `;
    
    mainQueryParams.push(limitInt, offset);
    
    const issuesResult = await query(issuesQuery, mainQueryParams);
    
    // Optionally include media previews for list view
    const issuesWithMedia = issuesResult.rows.map(issue => ({
      ...issue,
      has_media: issue.media_count > 0,
      preview_media: {
        thumbnail: issue.thumbnail_url,
        first_media: issue.first_media_url,
        first_media_type: issue.first_media_type,
        total_count: parseInt(issue.media_count)
      },
      user_vote_status: currentUserId ? {
        hasVoted: issue.user_has_voted,
        voteType: issue.user_vote_type || null,
        voteTypeText: issue.user_vote_type === 1 ? 'upvote' : 
                     issue.user_vote_type === -1 ? 'downvote' : null
      } : null
    }));

    return {
      issues: issuesWithMedia,
      pagination: getPaginationInfo(page, limitInt, totalCount)
    };
  },

  // Update issue status (with category-zone permissions)
  async updateIssueStatus(issueId, newStatus, userId, reason = null) {
    const result = await transaction(async (client) => {
      // Get current issue with zone and category info
      const currentIssueResult = await client.query(
        'SELECT i.*, ic.id as category_id FROM issues i LEFT JOIN issue_categories ic ON i.category_id = ic.id WHERE i.id = $1',
        [issueId]
      );
      
      if (currentIssueResult.rows.length === 0) {
        throw new Error('Issue not found');
      }
      
      const currentIssue = currentIssueResult.rows[0];
      
      // Check user permissions
      const user = await userService.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Category-zone permission check for stewards
      if (user.role === 'STEWARD') {
        const hasAccess = await this.checkStewardCategoryAccess(
          userId, 
          currentIssue.category_id, 
          currentIssue.zone_id, 
          client
        );
        if (!hasAccess) {
          throw new Error('Access denied: You are not authorized to manage this category in this zone');
        }
      }
      // Super admins can update any issue, citizens cannot update issue status
      else if (user.role === 'CITIZEN') {
        throw new Error('Access denied: Citizens cannot update issue status');
      }
      
      // Update issue status
      const updateResult = await client.query(
        `UPDATE issues 
         SET status = $1::issue_status, updated_at = NOW(), 
             resolved_at = CASE WHEN $1::issue_status = 'RESOLVED' THEN NOW() ELSE resolved_at END
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

  // Get user vote status for an issue
  async getUserVoteStatus(issueId, userId) {
    const result = await query(
      'SELECT vote_type FROM issue_votes WHERE issue_id = $1 AND user_id = $2',
      [issueId, userId]
    );
    
    if (result.rows.length === 0) {
      return { hasVoted: false, voteType: null };
    }
    
    return { 
      hasVoted: true, 
      voteType: result.rows[0].vote_type,
      voteTypeText: result.rows[0].vote_type === 1 ? 'upvote' : 'downvote'
    };
  },

  // Delete user vote on an issue
  async deleteVote(issueId, userId) {
    const result = await transaction(async (client) => {
      // Check if user has voted
      const existingVoteResult = await client.query(
        'SELECT vote_type FROM issue_votes WHERE issue_id = $1 AND user_id = $2',
        [issueId, userId]
      );
      
      if (existingVoteResult.rows.length === 0) {
        throw new Error('You have not voted on this issue');
      }
      
      const existingVote = existingVoteResult.rows[0];
      
      // Delete the vote
      await client.query(
        'DELETE FROM issue_votes WHERE issue_id = $1 AND user_id = $2',
        [issueId, userId]
      );
      
      // Calculate reputation change (reverse of original vote)
      const reputationChange = existingVote.vote_type === 1 ? -2 : 1;
      
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
      await client.query(
        `UPDATE users 
         SET reputation_score = reputation_score + $1 
         WHERE id = (SELECT user_id FROM issues WHERE id = $2)`,
        [reputationChange, issueId]
      );
      
      return { 
        voteScore: voteScoreResult.rows[0].vote_score, 
        reputationChange,
        deletedVoteType: existingVote.vote_type
      };
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
  },

  // Advanced filtering for issues
  async getIssuesWithFilters(filters = {}) {
    const {
      status,
      category,
      priority = 'recent', // recent, votes, urgent, oldest
      location, // { lat, lng, radius }
      dateRange, // { start, end }
      stewardId,
      userId,
      currentUserId, // Add current user ID for vote status
      search,
      limit = 50,
      offset = 0
    } = filters;

    // Build vote status clause and add parameters
    let voteSelectClause = '';
    let voteParams = [];
    if (currentUserId) {
      voteSelectClause = `, 
        (SELECT vote_type FROM issue_votes WHERE issue_id = i.id AND user_id = $${params.length + 1}) as user_vote_type,
        CASE WHEN (SELECT vote_type FROM issue_votes WHERE issue_id = i.id AND user_id = $${params.length + 2}) IS NOT NULL THEN true ELSE false END as user_has_voted`;
      voteParams = [currentUserId, currentUserId];
    } else {
      voteSelectClause = ', NULL as user_vote_type, false as user_has_voted';
    }

    let baseQuery = `
      SELECT i.*, u.full_name as user_name, ic.name as category_name,
             COUNT(c.id) as comment_count,
             COUNT(im.id) as media_count
             ${voteSelectClause},
             CASE 
               WHEN i.vote_score >= 50 THEN 'critical'
               WHEN i.vote_score >= 20 THEN 'high'
               WHEN i.vote_score >= 5 THEN 'medium'
               ELSE 'low'
             END as priority_level,
             EXTRACT(EPOCH FROM (NOW() - i.created_at))/3600 as hours_old
      FROM issues i
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN issue_categories ic ON i.category_id = ic.id
      LEFT JOIN comments c ON i.id = c.issue_id
      LEFT JOIN issue_media im ON i.id = im.issue_id
    `;

    const conditions = [];
    const params = [...voteParams];
    let paramIndex = params.length + 1; // Start after vote parameters

    // Status filter
    if (status && Array.isArray(status)) {
      conditions.push(`i.status = ANY($${paramIndex})`);
      params.push(status);
      paramIndex++;
    } else if (status) {
      conditions.push(`i.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Category filter
    if (category) {
      conditions.push(`i.category_id = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    // Location filter
    if (location && location.lat && location.lng) {
      const radius = location.radius || 5000; // 5km default
      conditions.push(`ST_DWithin(
        ST_SetSRID(ST_MakePoint(i.location_lng, i.location_lat), 4326),
        ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326),
        $${paramIndex + 2}
      )`);
      params.push(location.lng, location.lat, radius);
      paramIndex += 3;
    }

    // Date range filter
    if (dateRange) {
      if (dateRange.start) {
        conditions.push(`i.created_at >= $${paramIndex}`);
        params.push(dateRange.start);
        paramIndex++;
      }
      if (dateRange.end) {
        conditions.push(`i.created_at <= $${paramIndex}`);
        params.push(dateRange.end);
        paramIndex++;
      }
    }

    // Steward zone filter
    if (stewardId) {
      baseQuery += `
      INNER JOIN steward_zone_assignments sza ON ST_DWithin(
        ST_SetSRID(ST_MakePoint(i.location_lng, i.location_lat), 4326),
        ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326),
        10000
      )`;
      conditions.push(`sza.user_id = $${paramIndex}`);
      params.push(stewardId);
      paramIndex++;
    }

    // User filter
    if (userId) {
      conditions.push(`i.user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    // Search filter
    if (search) {
      conditions.push(`(i.title ILIKE $${paramIndex} OR i.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add WHERE clause
    if (conditions.length > 0) {
      baseQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add GROUP BY
    baseQuery += ` GROUP BY i.id, u.full_name, ic.name`;

    // Priority/ordering
    let orderClause;
    switch (priority) {
      case 'votes':
        orderClause = 'ORDER BY i.vote_score DESC, i.created_at DESC';
        break;
      case 'urgent':
        orderClause = 'ORDER BY i.vote_score DESC, i.created_at ASC';
        break;
      case 'oldest':
        orderClause = 'ORDER BY i.created_at ASC';
        break;
      case 'recent':
      default:
        orderClause = 'ORDER BY i.created_at DESC';
        break;
    }

    baseQuery += ` ${orderClause}`;

    // Add pagination
    baseQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(baseQuery, params);
    
    // Add user vote status to each issue
    const issuesWithVoteStatus = result.rows.map(issue => ({
      ...issue,
      user_vote_status: filters.currentUserId ? {
        hasVoted: issue.user_has_voted,
        voteType: issue.user_vote_type || null,
        voteTypeText: issue.user_vote_type === 1 ? 'upvote' : 
                     issue.user_vote_type === -1 ? 'downvote' : null
      } : null
    }));
    
    return issuesWithVoteStatus;
  },

  // Get issue statistics
  async getIssueStatistics() {
    const cacheKey = cacheService.generateKey('issue_statistics');
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT 
          COUNT(*) as total_issues,
          COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_issues,
          COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_issues,
          COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved_issues,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as issues_today,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as issues_this_week,
          AVG(vote_score) as avg_vote_score,
          MAX(vote_score) as highest_vote_score,
          COUNT(CASE WHEN vote_score >= 50 THEN 1 END) as critical_issues,
          COUNT(CASE WHEN vote_score >= 20 THEN 1 END) as high_priority_issues
        FROM issues
      `);
      
      return result.rows[0];
    }, 300);
  },

  // Get trending issues (high engagement)
  async getTrendingIssues(limit = 20, currentUserId = null) {
    const cacheKey = cacheService.generateKey('trending_issues', limit, currentUserId);
    
    return await cacheService.cached(cacheKey, async () => {
      let voteSelectClause = '';
      let queryParams = [limit];
      
      if (currentUserId) {
        voteSelectClause = `, 
          (SELECT vote_type FROM issue_votes WHERE issue_id = i.id AND user_id = $2) as user_vote_type,
          CASE WHEN (SELECT vote_type FROM issue_votes WHERE issue_id = i.id AND user_id = $3) IS NOT NULL THEN true ELSE false END as user_has_voted`;
        queryParams = [limit, currentUserId, currentUserId];
      } else {
        voteSelectClause = ', NULL as user_vote_type, false as user_has_voted';
      }
      
      const result = await query(`
        SELECT i.*, u.full_name as user_name, ic.name as category_name,
               COUNT(c.id) as comment_count,
               COUNT(im.id) as media_count,
               COUNT(iv.user_id) as vote_count
               ${voteSelectClause},
               (COUNT(c.id) * 2 + COUNT(iv.user_id) + i.vote_score) as engagement_score
        FROM issues i
        LEFT JOIN users u ON i.user_id = u.id
        LEFT JOIN issue_categories ic ON i.category_id = ic.id
        LEFT JOIN comments c ON i.id = c.issue_id AND c.created_at >= NOW() - INTERVAL '7 days'
        LEFT JOIN issue_votes iv ON i.id = iv.issue_id AND iv.created_at >= NOW() - INTERVAL '7 days'
        LEFT JOIN issue_media im ON i.id = im.issue_id
        WHERE i.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY i.id, u.full_name, ic.name
        ORDER BY engagement_score DESC, i.vote_score DESC
        LIMIT $1
      `, queryParams);
      
      // Add user vote status to each issue
      const issuesWithVoteStatus = result.rows.map(issue => ({
        ...issue,
        user_vote_status: currentUserId ? {
          hasVoted: issue.user_has_voted,
          voteType: issue.user_vote_type || null,
          voteTypeText: issue.user_vote_type === 1 ? 'upvote' : 
                       issue.user_vote_type === -1 ? 'downvote' : null
        } : null
      }));
      
      return issuesWithVoteStatus;
    }, 600);
  },

  // Bulk update issue status (with zone-based permissions)
  async bulkUpdateStatus(issueIds, newStatus, userId, reason = null) {
    return await transaction(async (client) => {
      // Get user role for permission checking
      const user = await userService.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let issuesQuery = 'SELECT * FROM issues WHERE id = ANY($1)';
      let queryParams = [issueIds];
      
      // For stewards, filter issues to only those in their assigned zones
      if (user.role === 'STEWARD') {
        issuesQuery = `
          SELECT i.* 
          FROM issues i
          JOIN zones z ON ST_Contains(z.boundary, ST_Point(i.location_lng, i.location_lat))
          JOIN steward_zones sz ON z.id = sz.zone_id
          WHERE i.id = ANY($1) 
            AND sz.steward_id = $2 
            AND sz.is_active = true
        `;
        queryParams = [issueIds, userId];
      }
      // Citizens cannot bulk update issue status
      else if (user.role === 'CITIZEN') {
        throw new Error('Access denied: Citizens cannot update issue status');
      }
      // SUPER_ADMIN can update any issue (no filtering needed)
      
      // Get issues user can access
      const accessibleIssuesResult = await client.query(issuesQuery, queryParams);
      const accessibleIssues = accessibleIssuesResult.rows;
      
      if (accessibleIssues.length === 0) {
        throw new Error('No accessible issues found to update');
      }
      
      // Check if steward tried to access unauthorized issues
      if (user.role === 'STEWARD' && accessibleIssues.length < issueIds.length) {
        const accessibleIds = accessibleIssues.map(issue => issue.id);
        const unauthorizedIds = issueIds.filter(id => !accessibleIds.includes(id));
        throw new Error(`Access denied: You cannot manage ${unauthorizedIds.length} issue(s) outside your assigned zones`);
      }
      
      const accessibleIssueIds = accessibleIssues.map(issue => issue.id);
      
      // Update issues
      const updateResult = await client.query(
        'UPDATE issues SET status = $1, updated_at = NOW() WHERE id = ANY($2) RETURNING *',
        [newStatus, accessibleIssueIds]
      );

      // Add history entries
      for (const issue of updateResult.rows) {
        await client.query(
          `INSERT INTO issue_history (issue_id, user_id, old_status, new_status, change_reason)
           VALUES ($1, $2, $3, $4, $5)`,
          [issue.id, userId, issue.status, newStatus, reason]
        );
      }

      return updateResult.rows;
    });
  },

  // Get issues requiring steward attention (only in assigned zones)
  async getIssuesRequiringAttention(stewardId, currentUserId = null) {
    let voteSelectClause = '';
    let queryParams = [stewardId];
    
    if (currentUserId) {
      voteSelectClause = `, 
        (SELECT vote_type FROM issue_votes WHERE issue_id = i.id AND user_id = $2) as user_vote_type,
        CASE WHEN (SELECT vote_type FROM issue_votes WHERE issue_id = i.id AND user_id = $3) IS NOT NULL THEN true ELSE false END as user_has_voted`;
      queryParams = [stewardId, currentUserId, currentUserId];
    } else {
      voteSelectClause = ', NULL as user_vote_type, false as user_has_voted';
    }
    
    const result = await query(`
      SELECT i.*, u.full_name as user_name, ic.name as category_name,
             COUNT(c.id) as comment_count,
             COUNT(sn.id) as steward_notes_count,
             z.name as zone_name, z.type as zone_type
             ${voteSelectClause},
             EXTRACT(EPOCH FROM (NOW() - i.created_at))/3600 as hours_old
      FROM issues i
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN issue_categories ic ON i.category_id = ic.id
      LEFT JOIN comments c ON i.id = c.issue_id
      LEFT JOIN steward_notes sn ON i.id = sn.issue_id
      JOIN zones z ON ST_Contains(z.boundary, ST_Point(i.location_lng, i.location_lat))
      JOIN steward_zones sz ON z.id = sz.zone_id
      WHERE sz.steward_id = $1 
        AND sz.is_active = true
        AND i.status IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS')
        AND (
          i.vote_score >= 10 
          OR EXTRACT(EPOCH FROM (NOW() - i.created_at))/3600 >= 48
          OR COUNT(c.id) >= 5
        )
      GROUP BY i.id, u.full_name, ic.name, z.name, z.type
      ORDER BY i.vote_score DESC, i.created_at ASC
      LIMIT 20
    `, queryParams);

    // Add user vote status to each issue
    const issuesWithVoteStatus = result.rows.map(issue => ({
      ...issue,
      user_vote_status: currentUserId ? {
        hasVoted: issue.user_has_voted,
        voteType: issue.user_vote_type || null,
        voteTypeText: issue.user_vote_type === 1 ? 'upvote' : 
                     issue.user_vote_type === -1 ? 'downvote' : null
      } : null
    }));

    return issuesWithVoteStatus;
  },

  // Get issue categories with statistics
  async getCategoriesWithStats() {
    const cacheKey = cacheService.generateKey('categories_with_stats');
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(`
        SELECT ic.*, 
               COUNT(i.id) as total_issues,
               COUNT(CASE WHEN i.status = 'OPEN' THEN 1 END) as open_issues,
               COUNT(CASE WHEN i.status = 'RESOLVED' THEN 1 END) as resolved_issues,
               AVG(i.vote_score) as avg_vote_score,
               COUNT(CASE WHEN i.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_issues
        FROM issue_categories ic
        LEFT JOIN issues i ON ic.id = i.category_id
        GROUP BY ic.id, ic.name, ic.description
        ORDER BY total_issues DESC
      `);
      
      return result.rows;
    }, 900);
  },

  // Hard delete issue with all connected data
  async hardDeleteIssue(issueId, currentUserId) {
    return await transaction(async (client) => {
      // First, get issue details
      const issueResult = await client.query(
        'SELECT * FROM issues WHERE id = $1',
        [issueId]
      );
      
      if (issueResult.rows.length === 0) {
        throw new Error('Issue not found');
      }
      
      const issue = issueResult.rows[0];
      
      // Check permissions - only SUPER_ADMIN or issue owner can hard delete
      if (currentUserId) {
        const userResult = await client.query(
          'SELECT role FROM users WHERE id = $1',
          [currentUserId]
        );
        
        const userRole = userResult.rows[0]?.role;
        if (userRole !== 'SUPER_ADMIN' && issue.user_id !== currentUserId) {
          throw new Error('You do not have permission to permanently delete this issue');
        }
      }
      
      // Delete from child tables first (due to foreign key constraints)
      
      // Delete votes
      await client.query('DELETE FROM issue_votes WHERE issue_id = $1', [issueId]);
      
      // Delete comment flags for comments on this issue
      await client.query(`
        DELETE FROM comment_flags 
        WHERE comment_id IN (
          SELECT id FROM comments WHERE issue_id = $1
        )
      `, [issueId]);
      
      // Delete comments (will cascade to nested comments due to CASCADE DELETE)
      await client.query('DELETE FROM comments WHERE issue_id = $1', [issueId]);
      
      // Delete issue history
      await client.query('DELETE FROM issue_history WHERE issue_id = $1', [issueId]);
      
      // Delete all media using the media service (this handles both DB and Cloudinary)
      const mediaService = require('./mediaService');
      const mediaDeletionResult = await mediaService.deleteAllIssueMedia(issueId);
      
      // Delete the main issue
      await client.query('DELETE FROM issues WHERE id = $1', [issueId]);
      
      // Clear related caches
      const cacheService = require('./redis/cacheService');
      await cacheService.delPattern(`issue_${issueId}*`);
      await cacheService.delPattern('issues_*');
      await cacheService.delPattern('dashboard_*');
      
      return {
        success: true,
        message: 'Issue and all connected data permanently deleted',
        deletedData: {
          issue: issue,
          mediaFiles: mediaDeletionResult.deletedMediaCount,
          cloudinaryCleanup: mediaDeletionResult.cloudinaryDeletions,
          cleanupCompleted: true
        }
      };
    });
  },

  // Check steward access to category in specific zone
  async checkStewardCategoryAccess(stewardId, categoryId, zoneId, client = null) {
    let result;
    
    if (client) {
      // Inside transaction - use client.query
      result = await client.query(`
        SELECT COUNT(*) as count
        FROM steward_categories sc
        WHERE sc.steward_id = $1 
          AND sc.category_id = $2
          AND sc.zone_id = $3
          AND sc.is_active = true
      `, [stewardId, categoryId, zoneId]);
    } else {
      // Regular operation - use query function
      result = await query(`
        SELECT COUNT(*) as count
        FROM steward_categories sc
        WHERE sc.steward_id = $1 
          AND sc.category_id = $2
          AND sc.zone_id = $3
          AND sc.is_active = true
      `, [stewardId, categoryId, zoneId]);
    }
    
    return parseInt(result.rows[0].count) > 0;
  },

  // Get steward's assigned category-zone combinations
  async getStewardZones(stewardId) {
    const result = await query(`
      SELECT DISTINCT z.*, 
             STRING_AGG(ic.name, ', ') as assigned_categories,
             COUNT(DISTINCT i.id) as issue_count,
             COUNT(DISTINCT CASE WHEN i.status = 'OPEN' THEN i.id END) as open_issues,
             COUNT(DISTINCT CASE WHEN i.status = 'IN_PROGRESS' THEN i.id END) as in_progress_issues
      FROM zones z
      JOIN steward_categories sc ON z.id = sc.zone_id
      JOIN issue_categories ic ON sc.category_id = ic.id
      LEFT JOIN issues i ON z.id = i.zone_id AND ic.id = i.category_id
      WHERE sc.steward_id = $1 AND sc.is_active = true
      GROUP BY z.id, z.name, z.type, z.description, z.area_name, z.pincode, z.created_at, z.updated_at
      ORDER BY z.name
    `, [stewardId]);
    
    return result.rows;
  },

  // Mark issue as duplicate (with zone permission check)
  async markAsDuplicate(issueId, originalIssueId, userId, reason = null) {
    const result = await transaction(async (client) => {
      // Get both issues
      const [issueResult, originalResult] = await Promise.all([
        client.query('SELECT * FROM issues WHERE id = $1', [issueId]),
        client.query('SELECT * FROM issues WHERE id = $1', [originalIssueId])
      ]);
      
      if (issueResult.rows.length === 0 || originalResult.rows.length === 0) {
        throw new Error('One or both issues not found');
      }
      
      const issue = issueResult.rows[0];
      
      // Check user permissions
      const user = await userService.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Category-zone permission check for stewards
      if (user.role === 'STEWARD') {
        const hasAccess = await this.checkStewardCategoryAccess(
          userId, 
          issue.category_id, 
          issue.zone_id, 
          client
        );
        if (!hasAccess) {
          throw new Error('Access denied: You are not authorized to manage this category in this zone');
        }
      }
      else if (user.role === 'CITIZEN') {
        throw new Error('Access denied: Citizens cannot mark issues as duplicates');
      }
      // SUPER_ADMIN can mark any issue as duplicate
      
      // Update issue
      const updateResult = await client.query(
        `UPDATE issues 
         SET status = 'DUPLICATE'::issue_status, primary_issue_id = $1, updated_at = NOW()
         WHERE id = $2 
         RETURNING *`,
        [originalIssueId, issueId]
      );
      
      // Record in history
      await client.query(
        `INSERT INTO issue_history (issue_id, user_id, old_status, new_status, change_reason)
         VALUES ($1, $2, $3::issue_status, 'DUPLICATE'::issue_status, $4)`,
        [issueId, userId, issue.status, reason || `Marked as duplicate of issue ${originalIssueId}`]
      );
      
      return updateResult.rows[0];
    });
    
    return result;
  }
};

module.exports = issueService;
