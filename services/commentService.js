const { query, transaction } = require('../config/database');

const commentService = {
  // Create a new comment (top-level or reply)
  async createComment(issueId, userId, content, parentCommentId = null) {
    const result = await transaction(async (client) => {
      // Validate parent comment exists if provided
      if (parentCommentId) {
        const parentCheck = await client.query(
          'SELECT id, issue_id FROM comments WHERE id = $1',
          [parentCommentId]
        );
        
        if (parentCheck.rows.length === 0) {
          throw new Error('Parent comment not found');
        }
        
        if (parentCheck.rows[0].issue_id !== issueId) {
          throw new Error('Parent comment belongs to different issue');
        }
      }
      
      // Create the comment
      const commentResult = await client.query(
        'INSERT INTO comments (issue_id, user_id, content, parent_comment_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [issueId, userId, content, parentCommentId]
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

  // Get comments for an issue with nested structure
  async getCommentsByIssueId(issueId, includeReplies = true) {
    if (includeReplies) {
      // Get all comments for the issue
      const result = await query(
        `SELECT 
          c.*,
          u.full_name as user_name,
          u.reputation_score as user_reputation,
          u.id as user_uuid
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.issue_id = $1
         ORDER BY c.created_at ASC`,
        [issueId]
      );
      
      // Organize into nested structure
      const comments = result.rows;
      const commentMap = new Map();
      const topLevelComments = [];
      
      // First pass: create comment objects with replies array
      comments.forEach(comment => {
        comment.replies = [];
        commentMap.set(comment.id, comment);
      });
      
      // Second pass: organize hierarchy
      comments.forEach(comment => {
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies.push(comment);
          }
        } else {
          topLevelComments.push(comment);
        }
      });
      
      return topLevelComments;
    } else {
      // Get only top-level comments
      const result = await query(
        `SELECT 
          c.*,
          u.full_name as user_name,
          u.reputation_score as user_reputation,
          (SELECT COUNT(*) FROM comments WHERE parent_comment_id = c.id) as reply_count
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.issue_id = $1 AND c.parent_comment_id IS NULL
         ORDER BY c.created_at ASC`,
        [issueId]
      );
      
      return result.rows;
    }
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
       SET content = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 
       RETURNING *`,
      [content, commentId, userId]
    );
    
    return result.rows[0] || null;
  },

  // Delete comment (cascade deletes replies due to FK constraint)
  async deleteComment(commentId, userId, isAdmin = false) {
    let deleteQuery;
    let params;
    
    if (isAdmin) {
      // Admin can delete any comment
      deleteQuery = 'DELETE FROM comments WHERE id = $1 RETURNING *';
      params = [commentId];
    } else {
      // User can only delete own comments
      deleteQuery = 'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING *';
      params = [commentId, userId];
    }
    
    const result = await transaction(async (client) => {
      // Get reply count before deletion
      const replyCountResult = await client.query(
        'SELECT COUNT(*) as reply_count FROM comments WHERE parent_comment_id = $1',
        [commentId]
      );
      
      const replyCount = parseInt(replyCountResult.rows[0].reply_count);
      
      // Delete comment (will cascade delete replies)
      const deleteResult = await client.query(deleteQuery, params);
      
      if (deleteResult.rows.length === 0) {
        throw new Error('Comment not found or unauthorized');
      }
      
      return {
        comment: deleteResult.rows[0],
        deletedRepliesCount: replyCount
      };
    });
    
    return result;
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
  async flagComment(commentId, userId, reason = 'INAPPROPRIATE', details = null) {
    const result = await transaction(async (client) => {
      // Check if user already flagged this comment
      const existingFlag = await client.query(
        'SELECT id FROM comment_flags WHERE comment_id = $1 AND user_id = $2',
        [commentId, userId]
      );
      
      if (existingFlag.rows.length > 0) {
        throw new Error('You have already flagged this comment');
      }
      
      // Check if comment exists
      const commentCheck = await client.query(
        'SELECT id, user_id FROM comments WHERE id = $1',
        [commentId]
      );
      
      if (commentCheck.rows.length === 0) {
        throw new Error('Comment not found');
      }
      
      // Don't allow flagging own comments
      if (commentCheck.rows[0].user_id === userId) {
        throw new Error('You cannot flag your own comment');
      }
      
      // Create flag record
      const flagResult = await client.query(
        `INSERT INTO comment_flags (comment_id, user_id, reason, details) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [commentId, userId, reason, details]
      );
      
      // Update comment flag count and status
      const updateResult = await client.query(
        `UPDATE comments 
         SET flag_count = flag_count + 1,
             is_flagged = CASE WHEN flag_count + 1 >= 3 THEN true ELSE is_flagged END,
             updated_at = NOW()
         WHERE id = $1 
         RETURNING *`,
        [commentId]
      );
      
      // Log the action
      await client.query(
        `INSERT INTO user_actions (user_id, action_type, target_id) 
         VALUES ($1, 'COMMENT_FLAGGED', $2)`,
        [userId, commentId]
      );
      
      return {
        flag: flagResult.rows[0],
        comment: updateResult.rows[0]
      };
    });
    
    return result;
  },

  // Get flagged comments (admin/steward only)
  async getFlaggedComments(limit = 50, offset = 0) {
    const result = await query(
      `SELECT 
        c.*,
        u.full_name as user_name,
        i.title as issue_title,
        COUNT(cf.id) as total_flags,
        array_agg(DISTINCT cf.reason) as flag_reasons
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN issues i ON c.issue_id = i.id
       LEFT JOIN comment_flags cf ON c.id = cf.comment_id
       WHERE c.is_flagged = true
       GROUP BY c.id, u.full_name, i.title
       ORDER BY c.flag_count DESC, c.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    return result.rows;
  },

  // Review flagged comment (admin/steward action)
  async reviewFlaggedComment(commentId, reviewerId, action, feedback = null) {
    const result = await transaction(async (client) => {
      if (action === 'APPROVE') {
        // Clear flags and reset status
        await client.query(
          `UPDATE comments 
           SET is_flagged = false, flag_count = 0, updated_at = NOW()
           WHERE id = $1`,
          [commentId]
        );
        
        await client.query(
          `UPDATE comment_flags 
           SET status = 'REJECTED', reviewed_by = $1, reviewed_at = NOW()
           WHERE comment_id = $2 AND status = 'PENDING'`,
          [reviewerId, commentId]
        );
      } else if (action === 'DELETE') {
        // Delete the comment and all its replies
        const deleteResult = await client.query(
          'DELETE FROM comments WHERE id = $1 RETURNING *',
          [commentId]
        );
        
        await client.query(
          `UPDATE comment_flags 
           SET status = 'APPROVED', reviewed_by = $1, reviewed_at = NOW()
           WHERE comment_id = $2 AND status = 'PENDING'`,
          [reviewerId, commentId]
        );
        
        return { action: 'deleted', comment: deleteResult.rows[0] };
      }
      
      return { action: 'approved', commentId };
    });
    
    return result;
  }
};

module.exports = commentService;
