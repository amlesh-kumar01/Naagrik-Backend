const { query, transaction } = require('../config/database');

const commentService = {
  // Create a new comment
  async createComment(issueId, userId, content) {
    const result = await transaction(async (client) => {
      // Create the comment
      const commentResult = await client.query(
        'INSERT INTO comments (issue_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
        [issueId, userId, content]
      );
      
      // Update user reputation
      await client.query(
        'UPDATE users SET reputation_score = reputation_score + 1 WHERE id = $1',
        [userId]
      );
      
      return commentResult.rows[0];
    });
    
    return result;
  },

  // Get comments for an issue
  async getCommentsByIssueId(issueId) {
    const result = await query(
      `SELECT 
        c.*,
        u.full_name as user_name,
        u.reputation_score as user_reputation
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.issue_id = $1
       ORDER BY c.created_at ASC`,
      [issueId]
    );
    
    return result.rows;
  },

  // Get comment by ID
  async getCommentById(commentId) {
    const result = await query(
      `SELECT 
        c.*,
        u.full_name as user_name,
        u.reputation_score as user_reputation
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [commentId]
    );
    
    return result.rows[0] || null;
  },

  // Update comment
  async updateComment(commentId, userId, content) {
    const result = await query(
      `UPDATE comments 
       SET content = $1 
       WHERE id = $2 AND user_id = $3 
       RETURNING *`,
      [content, commentId, userId]
    );
    
    return result.rows[0] || null;
  },

  // Delete comment
  async deleteComment(commentId, userId) {
    const result = await query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING *',
      [commentId, userId]
    );
    
    return result.rows[0] || null;
  },

  // Get user's comments
  async getUserComments(userId, limit = 20, offset = 0) {
    const result = await query(
      `SELECT 
        c.*,
        i.title as issue_title,
        i.status as issue_status
       FROM comments c
       LEFT JOIN issues i ON c.issue_id = i.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    return result.rows;
  },

  // Flag comment as inappropriate
  async flagComment(commentId, userId) {
    const result = await query(
      'UPDATE comments SET ai_flag = true WHERE id = $1 RETURNING *',
      [commentId]
    );
    
    // Log the action
    await query(
      `INSERT INTO user_actions (user_id, action_type, target_id) 
       VALUES ($1, 'COMMENT_FLAGGED', $2)`,
      [userId, commentId]
    );
    
    return result.rows[0] || null;
  }
};

module.exports = commentService;
