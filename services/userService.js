const { query, transaction } = require('../config/database');
const cacheService = require('./redis/cacheService');
const { hashPassword, comparePassword, sanitizeUser, calculateReputationChange } = require('../utils/helpers');

const userService = {
  // Create a new user
  async createUser(userData) {
    const { 
      email, 
      password, 
      fullName, 
      phoneNumber,
      dateOfBirth,
      gender,
      addressLine1,
      addressLine2,
      city = 'Kharagpur',
      state = 'West Bengal',
      pincode,
      country = 'India',
      preferredLanguage = 'en',
      occupation,
      organization,
      bio,
      websiteUrl,
      socialMedia,
      role = 'CITIZEN' 
    } = userData;
    
    const hashedPassword = await hashPassword(password);
    
    const result = await query(
      `INSERT INTO users (
        email, password_hash, full_name, phone_number, date_of_birth, gender,
        address_line1, address_line2, city, state, pincode, country,
        preferred_language, occupation, organization, bio, website_url, social_media, role,
        notification_preferences
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) 
       RETURNING id, email, full_name, phone_number, role, reputation_score, is_verified, created_at`,
      [
        email, hashedPassword, fullName, phoneNumber, dateOfBirth, gender,
        addressLine1, addressLine2, city, state, pincode, country,
        preferredLanguage, occupation, organization, bio, websiteUrl, 
        socialMedia ? JSON.stringify(socialMedia) : null, role,
        '{"email": true, "sms": false, "push": true}'
      ]
    );
    
    return sanitizeUser(result.rows[0]);
  },

  // Find user by email
  async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    return result.rows[0] || null;
  },

  // Find user by ID
  async findById(id) {
    const cacheKey = cacheService.generateKey('user', id);
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(
        `SELECT 
          id, email, full_name, phone_number, date_of_birth, gender,
          address_line1, address_line2, city, state, pincode, country,
          preferred_language, notification_preferences, occupation, organization, bio,
          website_url, social_media, role, reputation_score, is_active, is_verified,
          last_login, login_count, issues_reported, issues_resolved, created_at, updated_at
         FROM users WHERE id = $1`,
        [id]
      );
      
      return result.rows[0] || null;
    }, 600); // Cache for 10 minutes
  },

  // Authenticate user
  async authenticate(email, password) {
    const user = await this.findByEmail(email);
    if (!user) return null;
    
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) return null;
    
    return sanitizeUser(user);
  },

  // Update user reputation
  async updateReputation(userId, action) {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');
    
    const { change, newReputation } = calculateReputationChange(action, user.reputation_score);
    
    const result = await query(
      'UPDATE users SET reputation_score = $1 WHERE id = $2 RETURNING reputation_score',
      [newReputation, userId]
    );
    
    // Clear related caches
    await this.clearUserCache(userId);
    await this.clearLeaderboardCache();
    
    return { change, newReputation: result.rows[0].reputation_score };
  },

  // Clear user cache
  async clearUserCache(userId) {
    const userKey = cacheService.generateKey('user', userId);
    const badgesKey = cacheService.generateKey('user_badges', userId);
    const statsKey = cacheService.generateKey('user_stats', userId);
    
    await Promise.all([
      cacheService.del(userKey),
      cacheService.del(badgesKey),
      cacheService.del(statsKey)
    ]);
  },

  // Clear leaderboard cache
  async clearLeaderboardCache() {
    // Since we can't use pattern deletion in Upstash, clear common limits
    const limits = [10, 20, 50, 100];
    const keys = limits.map(limit => cacheService.generateKey('leaderboard', limit));
    
    await Promise.all(keys.map(key => cacheService.del(key)));
  },

  // Get leaderboard
  async getLeaderboard(limit = 50) {
    const cacheKey = cacheService.generateKey('leaderboard', limit);
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(
        `SELECT id, full_name, reputation_score, 
                RANK() OVER (ORDER BY reputation_score DESC) as rank
         FROM users 
         WHERE role != 'SUPER_ADMIN'
         ORDER BY reputation_score DESC 
         LIMIT $1`,
        [limit]
      );
      
      return result.rows;
    }, 300); // Cache for 5 minutes
  },

  // Get user badges
  async getUserBadges(userId) {
    const cacheKey = cacheService.generateKey('user_badges', userId);
    
    return await cacheService.cached(cacheKey, async () => {
      const result = await query(
        `SELECT b.id, b.name, b.description, b.icon_url, ub.earned_at
         FROM user_badges ub
         JOIN badges b ON ub.badge_id = b.id
         WHERE ub.user_id = $1
         ORDER BY ub.earned_at DESC`,
        [userId]
      );
      
      return result.rows;
    }, 600); // Cache for 10 minutes
  },

  // Get user statistics
  async getUserStats(userId) {
    const cacheKey = cacheService.generateKey('user_stats', userId);
    
    return await cacheService.cached(cacheKey, async () => {
      const statsResult = await query(
        `SELECT 
           (SELECT COUNT(*) FROM issues WHERE user_id = $1) as issues_created,
           (SELECT COUNT(*) FROM comments WHERE user_id = $1) as comments_made,
           (SELECT COUNT(*) FROM issue_votes WHERE user_id = $1) as votes_cast,
           (SELECT COUNT(*) FROM issues WHERE user_id = $1 AND status = 'RESOLVED') as issues_resolved
         `,
        [userId]
      );
      
      const badgesResult = await query(
        'SELECT COUNT(*) as badges_earned FROM user_badges WHERE user_id = $1',
        [userId]
      );
      
      return {
        ...statsResult.rows[0],
        badges_earned: parseInt(badgesResult.rows[0].badges_earned)
      };
    }, 300); // Cache for 5 minutes
  },

  // Update user role
  async updateRole(userId, newRole) {
    const result = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, full_name, role',
      [newRole, userId]
    );
    
    return result.rows[0] || null;
  },

  // Search users
  async searchUsers(searchTerm, limit = 20) {
    const result = await query(
      `SELECT id, full_name, email, role, reputation_score
       FROM users 
       WHERE (full_name ILIKE $1 OR email ILIKE $1)
       AND role != 'SUPER_ADMIN'
       ORDER BY reputation_score DESC
       LIMIT $2`,
      [`%${searchTerm}%`, limit]
    );
    
    return result.rows;
  },

  // Admin features
  async getAllUsers(filters = {}) {
    const { role, limit = 50, offset = 0, sortBy = 'created_at', sortOrder = 'DESC' } = filters;
    
    let query_text = `
      SELECT u.id, u.email, u.full_name, u.role, u.reputation_score, u.created_at,
             COUNT(DISTINCT i.id) as total_issues,
             COUNT(DISTINCT c.id) as total_comments,
             COUNT(DISTINCT ub.badge_id) as badges_earned,
             CASE 
               WHEN u.created_at >= NOW() - INTERVAL '7 days' THEN 'new'
               WHEN u.created_at >= NOW() - INTERVAL '30 days' THEN 'recent'
               ELSE 'established'
             END as user_status
      FROM users u
      LEFT JOIN issues i ON u.id = i.user_id
      LEFT JOIN comments c ON u.id = c.user_id
      LEFT JOIN user_badges ub ON u.id = ub.user_id
    `;
    
    const params = [limit, offset];
    let paramIndex = 3;
    
    if (role) {
      query_text += ` WHERE u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }
    
    query_text += ` GROUP BY u.id, u.email, u.full_name, u.role, u.reputation_score, u.created_at`;
    
    // Validate sort fields
    const validSortFields = ['created_at', 'reputation_score', 'full_name', 'email'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sort_order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    query_text += ` ORDER BY u.${sortField} ${sort_order} LIMIT $1 OFFSET $2`;
    
    const result = await query(query_text, params);
    return result.rows;
  },

  // Get user activity summary
  async getUserActivitySummary(userId) {
    const result = await query(`
      SELECT 
        COUNT(DISTINCT i.id) as total_issues,
        COUNT(DISTINCT c.id) as total_comments,
        COUNT(DISTINCT iv.issue_id) as total_votes,
        COUNT(DISTINCT ub.badge_id) as badges_earned,
        COUNT(DISTINCT CASE WHEN i.status = 'RESOLVED' THEN i.id END) as resolved_issues,
        COUNT(DISTINCT CASE WHEN i.created_at >= NOW() - INTERVAL '30 days' THEN i.id END) as recent_issues,
        COUNT(DISTINCT CASE WHEN c.created_at >= NOW() - INTERVAL '30 days' THEN c.id END) as recent_comments,
        AVG(i.vote_score) as avg_issue_score
      FROM users u
      LEFT JOIN issues i ON u.id = i.user_id
      LEFT JOIN comments c ON u.id = c.user_id
      LEFT JOIN issue_votes iv ON u.id = iv.user_id
      LEFT JOIN user_badges ub ON u.id = ub.user_id
      WHERE u.id = $1
      GROUP BY u.id
    `, [userId]);
    
    return result.rows[0] || {
      total_issues: 0,
      total_comments: 0,
      total_votes: 0,
      badges_earned: 0,
      resolved_issues: 0,
      recent_issues: 0,
      recent_comments: 0,
      avg_issue_score: 0
    };
  },

  // Update user reputation (with history)
  async updateReputation(userId, change, reason) {
    return await transaction(async (client) => {
      const result = await client.query(
        'UPDATE users SET reputation_score = reputation_score + $1 WHERE id = $2 RETURNING *',
        [change, userId]
      );
      
      // Log the reputation change
      await client.query(
        `INSERT INTO user_actions (user_id, action_type, target_id)
         VALUES ($1, $2, $3)`,
        [userId, `reputation_change:${change}:${reason}`, userId]
      );
      
      return result.rows[0];
    });
  },

  // Suspend/Unsuspend user
  async updateUserStatus(userId, suspended, reason) {
    // Note: You might want to add a 'suspended' column to users table
    // For now, we'll use user_actions to track this
    await query(
      `INSERT INTO user_actions (user_id, action_type, target_id)
       VALUES ($1, $2, $3)`,
      [userId, suspended ? `suspend:${reason}` : 'unsuspend', userId]
    );
    
    return { success: true, suspended, reason };
  },

  // Get user actions/history
  async getUserHistory(userId, limit = 50, offset = 0) {
    const result = await query(`
      SELECT ua.*, 
             CASE 
               WHEN ua.action_type LIKE 'reputation_change:%' THEN 'Reputation Change'
               WHEN ua.action_type LIKE 'suspend:%' THEN 'Account Suspended'
               WHEN ua.action_type = 'unsuspend' THEN 'Account Unsuspended'
               ELSE ua.action_type
             END as action_description
      FROM user_actions ua
      WHERE ua.user_id = $1
      ORDER BY ua.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);
    
    return result.rows;
  },

  // Get user statistics for admin dashboard
  async getUserStatistics() {
    const result = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'CITIZEN' THEN 1 END) as citizens,
        COUNT(CASE WHEN role = 'STEWARD' THEN 1 END) as stewards,
        COUNT(CASE WHEN role = 'SUPER_ADMIN' THEN 1 END) as admins,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month,
        AVG(reputation_score) as avg_reputation,
        MAX(reputation_score) as highest_reputation
      FROM users
    `);
    
    return result.rows[0];
  },

  // Bulk operations
  async bulkUpdateRole(userIds, newRole, adminId) {
    return await transaction(async (client) => {
      const result = await client.query(
        'UPDATE users SET role = $1 WHERE id = ANY($2) RETURNING id, email, full_name, role',
        [newRole, userIds]
      );
      
      // Log the bulk role change
      for (const userId of userIds) {
        await client.query(
          `INSERT INTO user_actions (user_id, action_type, target_id)
           VALUES ($1, $2, $3)`,
          [adminId, `bulk_role_change:${newRole}`, userId]
        );
      }
      
      return result.rows;
    });
  },

  // Get users with filters for admin
  async getFilteredUsers(filters = {}) {
    const { 
      role, 
      reputationMin, 
      reputationMax, 
      registeredAfter, 
      registeredBefore,
      hasIssues,
      hasBadges,
      search,
      limit = 50, 
      offset = 0 
    } = filters;
    
    let whereConditions = [];
    let params = [limit, offset];
    let paramIndex = 3;
    
    if (role) {
      whereConditions.push(`u.role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }
    
    if (reputationMin !== undefined) {
      whereConditions.push(`u.reputation_score >= $${paramIndex}`);
      params.push(reputationMin);
      paramIndex++;
    }
    
    if (reputationMax !== undefined) {
      whereConditions.push(`u.reputation_score <= $${paramIndex}`);
      params.push(reputationMax);
      paramIndex++;
    }
    
    if (registeredAfter) {
      whereConditions.push(`u.created_at >= $${paramIndex}`);
      params.push(registeredAfter);
      paramIndex++;
    }
    
    if (registeredBefore) {
      whereConditions.push(`u.created_at <= $${paramIndex}`);
      params.push(registeredBefore);
      paramIndex++;
    }
    
    if (hasIssues) {
      whereConditions.push('issue_count > 0');
    }
    
    if (hasBadges) {
      whereConditions.push('badge_count > 0');
    }
    
    if (search) {
      whereConditions.push(`(u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query_text = `
      SELECT u.id, u.email, u.full_name, u.role, u.reputation_score, u.created_at,
             COUNT(DISTINCT i.id) as issue_count,
             COUNT(DISTINCT ub.badge_id) as badge_count,
             COUNT(DISTINCT c.id) as comment_count
      FROM users u
      LEFT JOIN issues i ON u.id = i.user_id
      LEFT JOIN user_badges ub ON u.id = ub.user_id
      LEFT JOIN comments c ON u.id = c.user_id
      ${whereClause}
      GROUP BY u.id, u.email, u.full_name, u.role, u.reputation_score, u.created_at
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await query(query_text, params);
    return result.rows;
  },

  // Update user profile information
  async updateUserProfile(userId, profileData) {
    const {
      fullName,
      phoneNumber,
      dateOfBirth,
      gender,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      country,
      preferredLanguage,
      occupation,
      organization,
      bio,
      websiteUrl,
      socialMedia,
      notificationPreferences
    } = profileData;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(fullName);
    }
    if (phoneNumber !== undefined) {
      updates.push(`phone_number = $${paramIndex++}`);
      values.push(phoneNumber);
    }
    if (dateOfBirth !== undefined) {
      updates.push(`date_of_birth = $${paramIndex++}`);
      values.push(dateOfBirth);
    }
    if (gender !== undefined) {
      updates.push(`gender = $${paramIndex++}`);
      values.push(gender);
    }
    if (addressLine1 !== undefined) {
      updates.push(`address_line1 = $${paramIndex++}`);
      values.push(addressLine1);
    }
    if (addressLine2 !== undefined) {
      updates.push(`address_line2 = $${paramIndex++}`);
      values.push(addressLine2);
    }
    if (city !== undefined) {
      updates.push(`city = $${paramIndex++}`);
      values.push(city);
    }
    if (state !== undefined) {
      updates.push(`state = $${paramIndex++}`);
      values.push(state);
    }
    if (pincode !== undefined) {
      updates.push(`pincode = $${paramIndex++}`);
      values.push(pincode);
    }
    if (country !== undefined) {
      updates.push(`country = $${paramIndex++}`);
      values.push(country);
    }
    if (preferredLanguage !== undefined) {
      updates.push(`preferred_language = $${paramIndex++}`);
      values.push(preferredLanguage);
    }
    if (occupation !== undefined) {
      updates.push(`occupation = $${paramIndex++}`);
      values.push(occupation);
    }
    if (organization !== undefined) {
      updates.push(`organization = $${paramIndex++}`);
      values.push(organization);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      values.push(bio);
    }
    if (websiteUrl !== undefined) {
      updates.push(`website_url = $${paramIndex++}`);
      values.push(websiteUrl);
    }
    if (socialMedia !== undefined) {
      updates.push(`social_media = $${paramIndex++}`);
      values.push(JSON.stringify(socialMedia));
    }
    if (notificationPreferences !== undefined) {
      updates.push(`notification_preferences = $${paramIndex++}`);
      values.push(JSON.stringify(notificationPreferences));
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} 
       RETURNING id, email, full_name, phone_number, date_of_birth, gender,
       address_line1, address_line2, city, state, pincode, country,
       preferred_language, notification_preferences, occupation, organization, bio,
       website_url, social_media, role, reputation_score, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    // Clear cache
    const cacheKey = cacheService.generateKey('user', userId);
    await cacheService.del(cacheKey);

    return sanitizeUser(result.rows[0]);
  },

  // Verify phone number
  async verifyPhoneNumber(userId, verificationCode) {
    // In a real implementation, you'd verify the code against SMS service
    const result = await query(
      'UPDATE users SET phone_verified = true, updated_at = NOW() WHERE id = $1 RETURNING *',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    // Clear cache
    const cacheKey = cacheService.generateKey('user', userId);
    await cacheService.del(cacheKey);

    return sanitizeUser(result.rows[0]);
  },

  // Verify email address
  async verifyEmail(userId, verificationToken) {
    const result = await query(
      `UPDATE users SET is_verified = true, email_verified = true, 
       verification_token = NULL, updated_at = NOW() 
       WHERE id = $1 AND verification_token = $2 
       RETURNING *`,
      [userId, verificationToken]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid verification token or user not found');
    }

    // Clear cache
    const cacheKey = cacheService.generateKey('user', userId);
    await cacheService.del(cacheKey);

    return sanitizeUser(result.rows[0]);
  }
};

module.exports = userService;
