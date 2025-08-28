const redisClient = require('../config/redis');

class CacheService {
  constructor() {
    this.defaultTTL = 300; // 5 minutes
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

  // Generate cache key
  generateKey(prefix, ...parts) {
    return `${prefix}:${parts.join(':')}`;
  }

  // Get cached data
  async get(key) {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const client = this.getClient();
      if (!client) return null;
      
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set cached data
  async set(key, data, ttl = this.defaultTTL) {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const client = this.getClient();
      if (!client) return false;
      
      await client.setex(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete cached data
  async del(key) {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const client = this.getClient();
      if (!client) return false;
      
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Delete multiple keys by pattern
  async delPattern(pattern) {
    try {
      // Note: Upstash doesn't support KEYS command, so we'll track keys manually
      console.warn('Pattern deletion not supported in Upstash. Consider tracking keys manually.');
      return false;
    } catch (error) {
      console.error('Cache pattern delete error:', error);
      return false;
    }
  }

  // Cache wrapper for database queries
  async cached(key, fetchFunction, ttl = this.defaultTTL) {
    try {
      // Try to get from cache first
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, fetch from database
      const data = await fetchFunction();
      
      // Cache the result
      if (data !== null && data !== undefined) {
        await this.set(key, data, ttl);
      }

      return data;
    } catch (error) {
      console.error('Cache wrapper error:', error);
      // Fallback to direct fetch if cache fails
      return await fetchFunction();
    }
  }
}

module.exports = new CacheService();
