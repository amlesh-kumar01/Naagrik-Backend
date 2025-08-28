const { Redis } = require('@upstash/redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isEnabled = false;
    
    // Check if Redis is configured
    if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
      this.isEnabled = true;
    } else {
      console.warn('Redis not configured. Running without cache.');
    }
  }

  connect() {
    if (!this.isEnabled) {
      return null;
    }

    try {
      this.client = new Redis({
        url: process.env.REDIS_URL,
        token: process.env.REDIS_TOKEN,
      });
      
      this.isConnected = true;
      console.log('✅ Upstash Redis connected successfully');
      return this.client;
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      this.isConnected = false;
      this.isEnabled = false;
      return null;
    }
  }

  getClient() {
    if (!this.isEnabled) {
      return null;
    }

    if (!this.client) {
      return this.connect();
    }
    return this.client;
  }

  isRedisEnabled() {
    return this.isEnabled && this.isConnected;
  }

  async healthCheck() {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const client = this.getClient();
      if (!client) return false;
      
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;
