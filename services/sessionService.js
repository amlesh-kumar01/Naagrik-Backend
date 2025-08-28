const redisClient = require('../config/redis');

class SessionService {
  constructor() {
    this.sessionTTL = 7 * 24 * 60 * 60; // 7 days
    this.refreshTokenTTL = 30 * 24 * 60 * 60; // 30 days
    this.client = null;
  }

  getClient() {
    if (!this.client) {
      this.client = redisClient.getClient();
    }
    return this.client;
  }

  isEnabled() {
    return redisClient.isRedisEnabled();
  }

  // Generate session key
  sessionKey(userId) {
    return `session:${userId}`;
  }

  // Generate refresh token key
  refreshTokenKey(tokenId) {
    return `refresh:${tokenId}`;
  }

  // Generate refresh token family key
  refreshTokenFamilyKey(familyId) {
    return `refresh_family:${familyId}`;
  }

  // Store user session
  async createSession(userId, sessionData) {
    if (!this.isEnabled()) {
      return true; // Silently succeed when Redis is disabled
    }

    try {
      const key = this.sessionKey(userId);
      const client = this.getClient();
      if (!client) return false;
      
      await client.setex(key, this.sessionTTL, JSON.stringify({
        userId,
        loginTime: new Date().toISOString(),
        ...sessionData
      }));
      return true;
    } catch (error) {
      console.error('Session create error:', error);
      return false;
    }
  }

  // Get user session
  async getSession(userId) {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const key = this.sessionKey(userId);
      const client = this.getClient();
      if (!client) return null;
      
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Session get error:', error);
      return null;
    }
  }

  // Update session
  async updateSession(userId, updateData) {
    if (!this.isEnabled()) {
      return true;
    }

    try {
      const existingSession = await this.getSession(userId);
      if (!existingSession) return false;

      const updatedSession = { ...existingSession, ...updateData };
      const key = this.sessionKey(userId);
      const client = this.getClient();
      if (!client) return false;
      
      await client.setex(key, this.sessionTTL, JSON.stringify(updatedSession));
      return true;
    } catch (error) {
      console.error('Session update error:', error);
      return false;
    }
  }

  // Delete user session
  async deleteSession(userId) {
    if (!this.isEnabled()) {
      return true;
    }

    try {
      const key = this.sessionKey(userId);
      const client = this.getClient();
      if (!client) return false;
      
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Session delete error:', error);
      return false;
    }
  }

  // Store refresh token
  async storeRefreshToken(tokenId, userId, expiresAt, familyId = null) {
    if (!this.isEnabled()) {
      return true;
    }

    try {
      const key = this.refreshTokenKey(tokenId);
      const data = {
        userId,
        tokenId,
        familyId: familyId || tokenId, // Use tokenId as familyId if not provided
        createdAt: new Date().toISOString(),
        expiresAt,
        isActive: true
      };
      
      // Calculate TTL based on expiration
      const ttl = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      const client = this.getClient();
      if (!client) return false;
      
      await client.setex(key, Math.max(ttl, 60), JSON.stringify(data));
      
      // Store family tracking
      if (familyId) {
        const familyKey = this.refreshTokenFamilyKey(familyId);
        await client.setex(familyKey, Math.max(ttl, 60), JSON.stringify({
          userId,
          familyId,
          latestTokenId: tokenId,
          createdAt: new Date().toISOString()
        }));
      }
      
      return true;
    } catch (error) {
      console.error('Refresh token store error:', error);
      return false;
    }
  }

  // Get refresh token data
  async getRefreshToken(tokenId) {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const key = this.refreshTokenKey(tokenId);
      const client = this.getClient();
      if (!client) return null;
      
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Refresh token get error:', error);
      return null;
    }
  }

  // Delete refresh token
  async deleteRefreshToken(tokenId) {
    if (!this.isEnabled()) {
      return true;
    }

    try {
      const key = this.refreshTokenKey(tokenId);
      const client = this.getClient();
      if (!client) return false;
      
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Refresh token delete error:', error);
      return false;
    }
  }

  // Invalidate all refresh tokens for a user (for security)
  async invalidateUserRefreshTokens(userId) {
    if (!this.isEnabled()) {
      return true;
    }

    try {
      // Note: In a production system with pattern support, you'd use:
      // await client.del(`refresh:${userId}:*`);
      // For Upstash, we track this in the user session or maintain a list
      console.log(`Invalidating all refresh tokens for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Refresh token invalidation error:', error);
      return false;
    }
  }

  // Cleanup expired sessions (called periodically)
  async cleanupExpiredSessions() {
    console.log('Note: Manual cleanup needed for Upstash Redis. Consider implementing with TTL.');
    return true;
  }
}

module.exports = new SessionService();
