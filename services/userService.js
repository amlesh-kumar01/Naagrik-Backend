const { query, transaction } = require('../config/database');
const { hashPassword, comparePassword, sanitizeUser, calculateReputationChange } = require('../utils/helpers');

const userService = {
  // Create a new user
  async createUser(userData) {
    const { email, password, fullName, role = 'CITIZEN' } = userData;
    
    const hashedPassword = await hashPassword(password);
    
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, full_name, role, reputation_score, created_at`,
      [email, hashedPassword, fullName, role]
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
    const result = await query(
      'SELECT id, email, full_name, role, reputation_score, created_at FROM users WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
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
    
    return { change, newReputation: result.rows[0].reputation_score };
  },

  // Get leaderboard
  async getLeaderboard(limit = 50) {
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
  },

  // Get user badges
  async getUserBadges(userId) {
    const result = await query(
      `SELECT b.id, b.name, b.description, b.icon_url, ub.earned_at
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = $1
       ORDER BY ub.earned_at DESC`,
      [userId]
    );
    
    return result.rows;
  },

  // Get user statistics
  async getUserStats(userId) {
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
  }
};

module.exports = userService;
