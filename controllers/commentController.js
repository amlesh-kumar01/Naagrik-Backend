const commentService = require('../services/commentService');
const { formatApiResponse } = require('../utils/helpers');
const { query } = require('../config/database');

const commentController = {
  // Create new comment (top-level or reply)
  async createComment(req, res, next) {
    try {
      const { issueId } = req.params;
      const { content, parentCommentId } = req.body;
      const userId = req.user.id;
      
      const comment = await commentService.createComment(issueId, userId, content, parentCommentId);
      
      res.status(201).json(formatApiResponse(
        true,
        { comment },
        parentCommentId ? 'Reply created successfully' : 'Comment created successfully'
      ));
    } catch (error) {
      if (error.message === 'Parent comment not found') {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'Parent comment not found'
        ));
      }
      if (error.message === 'Parent comment belongs to different issue') {
        return res.status(400).json(formatApiResponse(
          false,
          null,
          'Parent comment must belong to the same issue'
        ));
      }
      next(error);
    }
  },

  // Get comments for an issue
  async getComments(req, res, next) {
    try {
      const { issueId } = req.params;
      const { nested = 'true', sortBy = 'oldest' } = req.query;
      
      const includeReplies = nested === 'true';
      let comments;
      
      if (sortBy === 'newest') {
        // Get flat list sorted by newest
        const result = await query(
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
        comments = result.rows;
      } else {
        // Get nested structure
        comments = await commentService.getCommentsByIssueId(issueId, includeReplies);
      }
      
      res.json(formatApiResponse(
        true,
        { comments, nested: includeReplies },
        'Comments retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get single comment
  async getComment(req, res, next) {
    try {
      const { commentId } = req.params;
      
      const comment = await commentService.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'Comment not found'
        ));
      }
      
      res.json(formatApiResponse(
        true,
        { comment },
        'Comment retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Update comment
  async updateComment(req, res, next) {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;
      
      // First check if comment exists
      const existingComment = await commentService.getCommentById(commentId);
      if (!existingComment) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'Comment not found'
        ));
      }
      
      // Check if user owns the comment
      if (existingComment.user_id !== userId) {
        return res.status(403).json(formatApiResponse(
          false,
          null,
          'You do not have permission to update this comment'
        ));
      }
      
      const comment = await commentService.updateComment(commentId, userId, content);
      
      res.json(formatApiResponse(
        true,
        { comment },
        'Comment updated successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Delete comment
  async deleteComment(req, res, next) {
    try {
      const { commentId } = req.params;
      const userId = req.user.id;
      const isAdmin = ['STEWARD', 'SUPER_ADMIN'].includes(req.user.role);
      
      // Check if comment exists
      const comment = await commentService.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'Comment not found'
        ));
      }
      
      // Check permissions
      if (comment.user_id !== userId && !isAdmin) {
        return res.status(403).json(formatApiResponse(
          false,
          null,
          'You can only delete your own comments'
        ));
      }
      
      const result = await commentService.deleteComment(commentId, userId, isAdmin);
      
      const message = result.deletedRepliesCount > 0 
        ? `Comment and ${result.deletedRepliesCount} replies deleted successfully`
        : 'Comment deleted successfully';
      
      res.json(formatApiResponse(
        true,
        { 
          deletedComment: result.comment,
          deletedRepliesCount: result.deletedRepliesCount
        },
        message
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get user's comments
  async getUserComments(req, res, next) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      const offset = (page - 1) * limit;
      const comments = await commentService.getUserComments(userId, parseInt(limit), offset);
      
      res.json(formatApiResponse(
        true,
        { comments },
        'User comments retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Flag comment as inappropriate
  async flagComment(req, res, next) {
    try {
      const { commentId } = req.params;
      const { reason = 'INAPPROPRIATE', details } = req.body;
      const userId = req.user.id;
      
      const result = await commentService.flagComment(commentId, userId, reason, details);
      
      const flagCount = result.comment.flag_count;
      const message = flagCount >= 3 
        ? 'Comment flagged and marked for review'
        : 'Comment flagged successfully';
      
      res.json(formatApiResponse(
        true,
        { 
          flag: result.flag,
          comment: {
            id: result.comment.id,
            is_flagged: result.comment.is_flagged,
            flag_count: result.comment.flag_count
          }
        },
        message
      ));
    } catch (error) {
      if (error.message === 'You have already flagged this comment') {
        return res.status(409).json(formatApiResponse(
          false,
          null,
          'You have already flagged this comment'
        ));
      }
      if (error.message === 'You cannot flag your own comment') {
        return res.status(400).json(formatApiResponse(
          false,
          null,
          'You cannot flag your own comment'
        ));
      }
      if (error.message === 'Comment not found') {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'Comment not found'
        ));
      }
      next(error);
    }
  },

  // Get flagged comments (admin/steward only)
  async getFlaggedComments(req, res, next) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      const comments = await commentService.getFlaggedComments(
        parseInt(limit), 
        parseInt(offset)
      );
      
      res.json(formatApiResponse(
        true,
        { comments },
        'Flagged comments retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Review flagged comment (admin/steward only)
  async reviewFlaggedComment(req, res, next) {
    try {
      const { commentId } = req.params;
      const { action, feedback } = req.body;
      const reviewerId = req.user.id;
      
      if (!['APPROVE', 'DELETE'].includes(action)) {
        return res.status(400).json(formatApiResponse(
          false,
          null,
          'Action must be APPROVE or DELETE'
        ));
      }
      
      const result = await commentService.reviewFlaggedComment(
        commentId, 
        reviewerId, 
        action, 
        feedback
      );
      
      const message = action === 'DELETE' 
        ? 'Comment deleted successfully' 
        : 'Comment approved and flags cleared';
      
      res.json(formatApiResponse(
        true,
        result,
        message
      ));
    } catch (error) {
      next(error);
    }
  }
};

module.exports = commentController;
