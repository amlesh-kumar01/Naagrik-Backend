const commentService = require('../services/commentService');
const { formatApiResponse } = require('../utils/helpers');

const commentController = {
  // Create new comment
  async createComment(req, res, next) {
    try {
      const { issueId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;
      
      const comment = await commentService.createComment(issueId, userId, content);
      
      res.status(201).json(formatApiResponse(
        true,
        { comment },
        'Comment created successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get comments for an issue
  async getComments(req, res, next) {
    try {
      const { issueId } = req.params;
      
      const comments = await commentService.getCommentsByIssueId(issueId);
      
      res.json(formatApiResponse(
        true,
        { comments },
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
      
      // Allow deletion by comment owner or admin/steward
      const comment = await commentService.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'Comment not found'
        ));
      }
      
      if (comment.user_id !== userId && !['STEWARD', 'SUPER_ADMIN'].includes(req.user.role)) {
        return res.status(403).json(formatApiResponse(
          false,
          null,
          'You can only delete your own comments'
        ));
      }
      
      const deletedComment = await commentService.deleteComment(commentId, userId);
      
      res.json(formatApiResponse(
        true,
        { comment: deletedComment },
        'Comment deleted successfully'
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
      const userId = req.user.id;
      
      const comment = await commentService.flagComment(commentId, userId);
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
        'Comment flagged successfully'
      ));
    } catch (error) {
      next(error);
    }
  }
};

module.exports = commentController;
