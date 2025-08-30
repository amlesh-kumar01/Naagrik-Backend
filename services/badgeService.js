const { query, transaction } = require('../config/database');
const { AppError } = require('../middleware/errors');

const badgeService = {
  // Create new badge
  async createBadge(name, description, iconUrl, requiredScore) {
    const result = await query(
      'INSERT INTO badges (name, description, icon_url, required_score) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, iconUrl, requiredScore]
    );
    
    return result.rows[0];
  },

  // Get all badges
  async getAllBadges() {
    const result = await query(
      `SELECT b.*, COUNT(ub.user_id) as earned_count
       FROM badges b
       LEFT JOIN user_badges ub ON b.id = ub.badge_id
       GROUP BY b.id, b.name, b.description, b.icon_url, b.required_score
       ORDER BY b.required_score ASC`
    );
    
    return result.rows;
  },

  // Get badge by ID
  async getBadgeById(badgeId) {
    const result = await query(
      'SELECT * FROM badges WHERE id = $1',
      [badgeId]
    );
    
    return result.rows[0];
  },

  // Update badge
  async updateBadge(badgeId, name, description, iconUrl, requiredScore) {
    const result = await query(
      'UPDATE badges SET name = $1, description = $2, icon_url = $3, required_score = $4 WHERE id = $5 RETURNING *',
      [name, description, iconUrl, requiredScore, badgeId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Badge not found', 404);
    }
    
    return result.rows[0];
  },

  // Delete badge
  async deleteBadge(badgeId) {
    const result = await query(
      'DELETE FROM badges WHERE id = $1 RETURNING *',
      [badgeId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Badge not found', 404);
    }
    
    return result.rows[0];
  },

  // Award badge to user manually
  async awardBadgeToUser(userId, badgeId) {
    const result = await query(
      'INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT (user_id, badge_id) DO NOTHING RETURNING *',
      [userId, badgeId]
    );
    
    return result.rows[0];
  },

  // Remove badge from user
  async removeBadgeFromUser(userId, badgeId) {
    const result = await query(
      'DELETE FROM user_badges WHERE user_id = $1 AND badge_id = $2 RETURNING *',
      [userId, badgeId]
    );
    
    return result.rows[0];
  },

  // Get users who earned a specific badge
  async getBadgeHolders(badgeId, limit = 50, offset = 0) {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.reputation_score, ub.earned_at
       FROM user_badges ub
       JOIN users u ON ub.user_id = u.id
       WHERE ub.badge_id = $1
       ORDER BY ub.earned_at DESC
       LIMIT $2 OFFSET $3`,
      [badgeId, limit, offset]
    );
    
    return result.rows;
  },

  // Get badge statistics
  async getBadgeStats(badgeId) {
    const result = await query(
      `SELECT 
        COUNT(ub.user_id) as total_earned,
        COUNT(CASE WHEN ub.earned_at >= NOW() - INTERVAL '30 days' THEN 1 END) as earned_last_month,
        COUNT(CASE WHEN ub.earned_at >= NOW() - INTERVAL '7 days' THEN 1 END) as earned_last_week,
        MIN(ub.earned_at) as first_earned,
        MAX(ub.earned_at) as last_earned
       FROM user_badges ub
       WHERE ub.badge_id = $1`,
      [badgeId]
    );
    
    return result.rows[0] || {
      total_earned: 0,
      earned_last_month: 0,
      earned_last_week: 0,
      first_earned: null,
      last_earned: null
    };
  },

  // Check and award eligible badges to user
  async checkAndAwardBadges(userId, currentScore) {
    const eligibleBadges = await query(
      `SELECT b.id, b.name
       FROM badges b
       WHERE b.required_score <= $1
       AND b.id NOT IN (
         SELECT badge_id FROM user_badges WHERE user_id = $2
       )`,
      [currentScore, userId]
    );
    
    const awardedBadges = [];
    
    for (const badge of eligibleBadges.rows) {
      const awarded = await this.awardBadgeToUser(userId, badge.id);
      if (awarded) {
        awardedBadges.push({
          id: badge.id,
          name: badge.name,
          earned_at: awarded.earned_at
        });
      }
    }
    
    return awardedBadges;
  }
};

module.exports = badgeService;
