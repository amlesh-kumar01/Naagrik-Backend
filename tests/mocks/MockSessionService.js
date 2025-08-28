/**
 * Mock Session Service for Testing
 * Provides in-memory storage for refresh tokens when Redis is not available
 */

class MockSessionService {
  constructor() {
    this.refreshTokens = new Map();
    this.sessions = new Map();
  }

  // Check if Redis is enabled (always false for mock)
  isEnabled() {
    return false;
  }

  // Mock session management
  async createSession(userId, sessionData) {
    this.sessions.set(userId, {
      ...sessionData,
      createdAt: new Date().toISOString()
    });
    return true;
  }

  async getSession(userId) {
    return this.sessions.get(userId) || null;
  }

  async deleteSession(userId) {
    return this.sessions.delete(userId);
  }

  async updateSession(userId, sessionData) {
    if (this.sessions.has(userId)) {
      this.sessions.set(userId, {
        ...this.sessions.get(userId),
        ...sessionData,
        updatedAt: new Date().toISOString()
      });
      return true;
    }
    return false;
  }

  // Mock refresh token management
  async storeRefreshToken(tokenId, userId, expiresAt, familyId = null) {
    const data = {
      userId,
      tokenId,
      familyId: familyId || tokenId,
      createdAt: new Date().toISOString(),
      expiresAt,
      isActive: true
    };
    
    this.refreshTokens.set(tokenId, data);
    return true;
  }

  async getRefreshToken(tokenId) {
    const data = this.refreshTokens.get(tokenId);
    if (!data) return null;
    
    // Check if expired
    if (new Date(data.expiresAt) < new Date()) {
      this.refreshTokens.delete(tokenId);
      return null;
    }
    
    return data;
  }

  async deleteRefreshToken(tokenId) {
    return this.refreshTokens.delete(tokenId);
  }

  async invalidateUserRefreshTokens(userId) {
    const tokensToDelete = [];
    for (const [tokenId, data] of this.refreshTokens.entries()) {
      if (data.userId === userId) {
        tokensToDelete.push(tokenId);
      }
    }
    
    tokensToDelete.forEach(tokenId => {
      this.refreshTokens.delete(tokenId);
    });
    
    return tokensToDelete.length;
  }

  async invalidateTokenFamily(familyId) {
    const tokensToDelete = [];
    for (const [tokenId, data] of this.refreshTokens.entries()) {
      if (data.familyId === familyId) {
        tokensToDelete.push(tokenId);
      }
    }
    
    tokensToDelete.forEach(tokenId => {
      this.refreshTokens.delete(tokenId);
    });
    
    return tokensToDelete.length;
  }

  // Cleanup for tests
  clear() {
    this.refreshTokens.clear();
    this.sessions.clear();
  }

  // Get all stored tokens (for testing)
  getAllTokens() {
    return new Map(this.refreshTokens);
  }

  // Get all sessions (for testing)
  getAllSessions() {
    return new Map(this.sessions);
  }
}

module.exports = MockSessionService;
