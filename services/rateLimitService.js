const redisClient = require('../config/redis');

class RateLimitService {
  constructor() {
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

  // Generate rate limit key
  generateKey(identifier, type = 'general') {
    return `ratelimit:${type}:${identifier}`;
  }

  // Check and increment rate limit
  async checkRateLimit(identifier, maxRequests = 100, windowSeconds = 3600, type = 'general') {
    // If Redis is disabled, allow all requests
    if (!this.isEnabled()) {
      return {
        allowed: true,
        limit: maxRequests,
        current: 1,
        resetTime: Date.now() + (windowSeconds * 1000)
      };
    }

    try {
      const key = this.generateKey(identifier, type);
      const client = this.getClient();
      if (!client) {
        // Fallback: allow the request
        return {
          allowed: true,
          limit: maxRequests,
          current: 1,
          resetTime: Date.now() + (windowSeconds * 1000)
        };
      }

      // Get current count
      const current = await client.get(key);
      const currentCount = current ? parseInt(current) : 0;

      if (currentCount >= maxRequests) {
        // Get TTL to know when the window resets
        const ttl = await client.ttl(key);
        return {
          allowed: false,
          limit: maxRequests,
          current: currentCount,
          resetTime: Date.now() + (ttl * 1000)
        };
      }

      // Increment counter
      if (currentCount === 0) {
        // First request in window - set with expiration
        await client.setex(key, windowSeconds, 1);
      } else {
        // Increment existing counter
        await client.incr(key);
      }

      return {
        allowed: true,
        limit: maxRequests,
        current: currentCount + 1,
        resetTime: Date.now() + (windowSeconds * 1000)
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request to prevent blocking users
      return {
        allowed: true,
        limit: maxRequests,
        current: 0,
        resetTime: Date.now() + (windowSeconds * 1000)
      };
    }
  }

  // Express middleware factory
  createMiddleware(options = {}) {
    const {
      maxRequests = 100,
      windowSeconds = 3600,
      type = 'general',
      keyGenerator = (req) => req.ip,
      skipSuccessfulRequests = false,
      skipFailedRequests = false
    } = options;

    return async (req, res, next) => {
      try {
        const identifier = keyGenerator(req);
        const result = await this.checkRateLimit(identifier, maxRequests, windowSeconds, type);

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': result.limit,
          'X-RateLimit-Remaining': Math.max(0, result.limit - result.current),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
        });

        if (!result.allowed) {
          return res.status(429).json({
            success: false,
            message: 'Rate limit exceeded',
            data: {
              limit: result.limit,
              resetTime: result.resetTime
            }
          });
        }

        next();
      } catch (error) {
        console.error('Rate limit middleware error:', error);
        // On error, allow the request
        next();
      }
    };
  }

  // API-specific rate limiters
  authRateLimit() {
    return this.createMiddleware({
      maxRequests: 5,
      windowSeconds: 900, // 15 minutes
      type: 'auth',
      keyGenerator: (req) => req.ip
    });
  }

  uploadRateLimit() {
    return this.createMiddleware({
      maxRequests: 10,
      windowSeconds: 3600, // 1 hour
      type: 'upload',
      keyGenerator: (req) => req.user?.id || req.ip
    });
  }

  commentRateLimit() {
    return this.createMiddleware({
      maxRequests: 50,
      windowSeconds: 3600, // 1 hour
      type: 'comment',
      keyGenerator: (req) => req.user?.id || req.ip
    });
  }

  issueRateLimit() {
    return this.createMiddleware({
      maxRequests: 20,
      windowSeconds: 3600, // 1 hour
      type: 'issue',
      keyGenerator: (req) => req.user?.id || req.ip
    });
  }

  // Reset rate limit for an identifier
  async resetRateLimit(identifier, type = 'general') {
    if (!this.isEnabled()) {
      return true;
    }

    try {
      const key = this.generateKey(identifier, type);
      const client = this.getClient();
      if (!client) return false;
      
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Rate limit reset error:', error);
      return false;
    }
  }
}

module.exports = new RateLimitService();
