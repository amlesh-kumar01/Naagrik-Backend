const { query, transaction } = require('../config/database');
const { deleteAsset, uploadImage, uploadVideo } = require('../utils/cloudinary');

const mediaService = {
  /**
   * Process uploaded files and save to database
   * Handles Cloudinary upload and database operations
   */
  async processAndSaveFiles(issueId, userId, uploadedFiles) {
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return [];
    }

    const mediaArray = [];
    
    // Process each file and upload to Cloudinary
    for (const file of uploadedFiles) {
      try {
        let uploadResult;
        
        // Determine if it's an image or video and upload accordingly
        if (file.mimetype.startsWith('image/')) {
          uploadResult = await uploadImage(file.buffer, {
            resource_type: 'image',
            folder: 'naagrik/issues'
          });
        } else if (file.mimetype.startsWith('video/')) {
          uploadResult = await uploadVideo(file.buffer, {
            resource_type: 'video',
            folder: 'naagrik/issues'
          });
        }
        
        if (uploadResult) {
          mediaArray.push({
            url: uploadResult.secure_url,
            type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            publicId: uploadResult.public_id
          });
        }
      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        // Continue with other files, don't fail the entire operation
      }
    }
    
    // Save all successfully uploaded media to database
    if (mediaArray.length > 0) {
      return await this.createMultipleMediaRecords(issueId, userId, mediaArray);
    }
    
    return [];
  },

  /**
   * Store media record in database after successful Cloudinary upload
   */
  async createMediaRecord(mediaData) {
    const {
      issueId,
      userId,
      url,
      publicId,
      type,
      width = null,
      height = null,
      duration = null,
      isThumbnail = false
    } = mediaData;

    // Validate required fields
    if (!issueId || !userId || !url || !type) {
      throw new Error('Issue ID, user ID, URL, and type are required');
    }

    // Validate media type
    const mediaType = type.toUpperCase();
    if (!['IMAGE', 'VIDEO'].includes(mediaType)) {
      throw new Error('Media type must be IMAGE or VIDEO');
    }
    
    const result = await query(
      `INSERT INTO issue_media (
        issue_id, user_id, media_url, media_type, is_thumbnail, 
        moderation_status, ai_tags
      ) VALUES ($1, $2, $3, $4::media_type, $5, 'APPROVED', NULL)
      RETURNING *`,
      [issueId, userId, url, mediaType, isThumbnail]
    );

    return result.rows[0];
  },

  /**
   * Store multiple media records in a transaction
   */
  async createMultipleMediaRecords(issueId, userId, mediaArray) {
    if (!issueId || !userId) {
      throw new Error('Issue ID and user ID are required');
    }

    if (!Array.isArray(mediaArray) || mediaArray.length === 0) {
      throw new Error('Media array is required and must not be empty');
    }

    // Validate all media objects
    for (const media of mediaArray) {
      if (!media.url || !media.type) {
        throw new Error('Each media item must have url and type');
      }
    }

    return await transaction(async (client) => {
      const mediaRecords = [];
      
      for (let i = 0; i < mediaArray.length; i++) {
        const media = mediaArray[i];
        const isThumbnail = i === 0; // First media as thumbnail
        const mediaType = media.type.toUpperCase();
        
        if (!['IMAGE', 'VIDEO'].includes(mediaType)) {
          throw new Error(`Invalid media type: ${media.type}. Must be IMAGE or VIDEO`);
        }
        
        const result = await client.query(
          `INSERT INTO issue_media (
            issue_id, user_id, media_url, media_type, is_thumbnail, 
            moderation_status, ai_tags
          ) VALUES ($1, $2, $3, $4::media_type, $5, 'APPROVED', NULL)
          RETURNING *`,
          [
            issueId, 
            userId, 
            media.url, 
            mediaType, 
            isThumbnail
          ]
        );
        
        mediaRecords.push(result.rows[0]);
      }
      
      return mediaRecords;
    });
  },

  /**
   * Get all media for an issue
   */
  async getIssueMedia(issueId) {
    const result = await query(
      `SELECT 
        id, media_url, media_type, is_thumbnail, moderation_status, 
        ai_tags, created_at
       FROM issue_media
       WHERE issue_id = $1 AND moderation_status != 'REJECTED'
       ORDER BY is_thumbnail DESC, created_at ASC`,
      [issueId]
    );

    return result.rows;
  },

  /**
   * Get media by ID
   */
  async getMediaById(mediaId) {
    const result = await query(
      `SELECT * FROM issue_media WHERE id = $1`,
      [mediaId]
    );

    return result.rows[0] || null;
  },

  /**
   * Delete media record and from Cloudinary
   */
  async deleteMedia(mediaId, userId) {
    return await transaction(async (client) => {
      // Get media record first
      const mediaResult = await client.query(
        'SELECT * FROM issue_media WHERE id = $1 AND user_id = $2',
        [mediaId, userId]
      );

      if (mediaResult.rows.length === 0) {
        throw new Error('Media not found or unauthorized');
      }

      const media = mediaResult.rows[0];

      // Delete from database
      await client.query(
        'DELETE FROM issue_media WHERE id = $1',
        [mediaId]
      );

      return media;
    });
  },

  /**
   * Update media moderation status
   */
  async updateModerationStatus(mediaId, status, moderationScore = null, aiTags = null) {
    const result = await query(
      `UPDATE issue_media 
       SET moderation_status = $2::moderation_status,
           ai_tags = $3
       WHERE id = $1
       RETURNING *`,
      [mediaId, status, aiTags]
    );

    return result.rows[0] || null;
  },

  /**
   * Set new thumbnail for an issue
   */
  async setIssueThumbnail(issueId, mediaId, userId) {
    return await transaction(async (client) => {
      // Verify user owns the issue
      const issueResult = await client.query(
        'SELECT user_id FROM issues WHERE id = $1',
        [issueId]
      );

      if (issueResult.rows.length === 0) {
        throw new Error('Issue not found');
      }

      if (issueResult.rows[0].user_id !== userId) {
        throw new Error('Unauthorized');
      }

      // Remove thumbnail flag from all media for this issue
      await client.query(
        'UPDATE issue_media SET is_thumbnail = FALSE WHERE issue_id = $1',
        [issueId]
      );

      // Set new thumbnail
      const result = await client.query(
        `UPDATE issue_media 
         SET is_thumbnail = TRUE 
         WHERE id = $1 AND issue_id = $2
         RETURNING *`,
        [mediaId, issueId]
      );

      if (result.rows.length === 0) {
        throw new Error('Media not found for this issue');
      }

      return result.rows[0];
    });
  },

  /**
   * Get media requiring moderation
   */
  async getPendingModerationMedia(limit = 50) {
    const result = await query(
      `SELECT 
        im.*,
        i.title as issue_title,
        u.full_name as user_name
       FROM issue_media im
       LEFT JOIN issues i ON im.issue_id = i.id
       LEFT JOIN users u ON im.user_id = u.id
       WHERE im.moderation_status = 'PENDING'
       ORDER BY im.created_at ASC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  },

  /**
   * Get user's media uploads
   */
  async getUserMedia(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const result = await query(
      `SELECT 
        im.*,
        i.title as issue_title,
        i.status as issue_status
       FROM issue_media im
       LEFT JOIN issues i ON im.issue_id = i.id
       WHERE im.user_id = $1
       ORDER BY im.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  },

  /**
   * Get media statistics
   */
  async getMediaStats() {
    const result = await query(
      `SELECT 
        COUNT(*) as total_media,
        COUNT(CASE WHEN media_type = 'IMAGE' THEN 1 END) as total_images,
        COUNT(CASE WHEN media_type = 'VIDEO' THEN 1 END) as total_videos,
        COUNT(CASE WHEN moderation_status = 'PENDING' THEN 1 END) as pending_moderation,
        COUNT(CASE WHEN moderation_status = 'APPROVED' THEN 1 END) as approved,
        COUNT(CASE WHEN moderation_status = 'REJECTED' THEN 1 END) as rejected
       FROM issue_media`
    );

    return result.rows[0];
  },

  /**
   * Add media to an existing issue
   */
  async addMediaToIssue(issueId, userId, mediaUrl, mediaType, isThumbnail = false) {
    const result = await query(
      `INSERT INTO issue_media (
        issue_id, user_id, media_url, media_type, is_thumbnail, moderation_status
      ) VALUES ($1, $2, $3, $4::media_type, $5, 'APPROVED')
      RETURNING *`,
      [issueId, userId, mediaUrl, mediaType, isThumbnail]
    );
    
    return result.rows[0];
  },

  /**
   * Update thumbnail for an issue
   */
  async updateIssueThumbnail(issueId, newThumbnailUrl, userId) {
    return await transaction(async (client) => {
      // Remove existing thumbnail flag
      await client.query(
        'UPDATE issue_media SET is_thumbnail = false WHERE issue_id = $1',
        [issueId]
      );
      
      // Set new thumbnail
      const thumbnailResult = await client.query(
        `INSERT INTO issue_media (
          issue_id, user_id, media_url, media_type, is_thumbnail, moderation_status
        ) VALUES ($1, $2, $3, 'IMAGE', true, 'APPROVED')
        ON CONFLICT DO NOTHING
        RETURNING *`,
        [issueId, userId, newThumbnailUrl]
      );
      
      // If the media already exists, just update the thumbnail flag
      if (thumbnailResult.rows.length === 0) {
        await client.query(
          'UPDATE issue_media SET is_thumbnail = true WHERE issue_id = $1 AND media_url = $2',
          [issueId, newThumbnailUrl]
        );
      }
      
      return thumbnailResult.rows[0];
    });
  },

  /**
   * Remove media from issue
   */
  async removeMediaFromIssue(mediaId, userId) {
    const result = await query(
      'DELETE FROM issue_media WHERE id = $1 AND user_id = $2 RETURNING *',
      [mediaId, userId]
    );
    
    return result.rows[0];
  }
};

module.exports = mediaService;
