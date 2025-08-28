const userService = require('../services/userService');
const sessionService = require('../services/sessionService');
const { generateToken, formatApiResponse } = require('../utils/helpers');
const crypto = require('crypto');

const authController = {
  // Register new user
  async register(req, res, next) {
    try {
      const { email, password, fullName } = req.body;
      
      // Check if user already exists
      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        return res.status(409).json(formatApiResponse(
          false, 
          null, 
          'User with this email already exists'
        ));
      }
      
      // Create new user
      const user = await userService.createUser({ email, password, fullName });
      
      // Generate tokens
      const token = generateToken(user.id);
      const refreshTokenId = crypto.randomUUID();
      const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      // Store session and refresh token
      await sessionService.createSession(user.id, {
        lastActivity: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
      
      await sessionService.storeRefreshToken(
        refreshTokenId, 
        user.id, 
        refreshTokenExpiry.toISOString(),
        refreshTokenId // Use the token ID as the initial family ID
      );
      
      res.status(201).json(formatApiResponse(
        true,
        { 
          user, 
          token,
          refreshToken: refreshTokenId
        },
        'User registered successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Login user
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      // Authenticate user
      const user = await userService.authenticate(email, password);
      if (!user) {
        return res.status(401).json(formatApiResponse(
          false,
          null,
          'Invalid email or password'
        ));
      }
      
      // Generate tokens
      const token = generateToken(user.id);
      const refreshTokenId = crypto.randomUUID();
      const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      // Store session and refresh token
      await sessionService.createSession(user.id, {
        lastActivity: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
      
      await sessionService.storeRefreshToken(
        refreshTokenId, 
        user.id, 
        refreshTokenExpiry.toISOString(),
        refreshTokenId // Use the token ID as the initial family ID
      );
      
      res.json(formatApiResponse(
        true,
        { 
          user, 
          token,
          refreshToken: refreshTokenId
        },
        'Login successful'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Get current user profile
  async getMe(req, res, next) {
    try {
      const user = await userService.findById(req.user.id);
      if (!user) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'User not found'
        ));
      }
      
      // Get user stats and badges
      const [stats, badges] = await Promise.all([
        userService.getUserStats(user.id),
        userService.getUserBadges(user.id)
      ]);
      
      res.json(formatApiResponse(
        true,
        {
          user: { ...user, stats, badges }
        },
        'Profile retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Refresh token
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json(formatApiResponse(
          false,
          null,
          'Refresh token is required'
        ));
      }
      
      // Validate refresh token
      const tokenData = await sessionService.getRefreshToken(refreshToken);
      if (!tokenData) {
        return res.status(401).json(formatApiResponse(
          false,
          null,
          'Invalid or expired refresh token'
        ));
      }
      
      // Check if token is expired
      if (new Date(tokenData.expiresAt) < new Date()) {
        await sessionService.deleteRefreshToken(refreshToken);
        return res.status(401).json(formatApiResponse(
          false,
          null,
          'Refresh token has expired'
        ));
      }
      
      // Get user
      const user = await userService.findById(tokenData.userId);
      if (!user) {
        await sessionService.deleteRefreshToken(refreshToken);
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'User not found'
        ));
      }
      
      // Generate new tokens
      const newToken = generateToken(user.id);
      const newRefreshTokenId = crypto.randomUUID();
      const newRefreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      // Use the family ID from the old token, or create a new family
      const familyId = tokenData.familyId || tokenData.tokenId;
      
      // Delete old refresh token and store new one with family tracking
      await sessionService.deleteRefreshToken(refreshToken);
      await sessionService.storeRefreshToken(
        newRefreshTokenId, 
        user.id, 
        newRefreshTokenExpiry.toISOString(),
        familyId
      );
      
      // Update session activity
      await sessionService.updateSession(user.id, {
        lastActivity: new Date().toISOString(),
        lastRefreshAt: new Date().toISOString()
      });
      
      res.json(formatApiResponse(
        true,
        { 
          token: newToken,
          refreshToken: newRefreshTokenId
        },
        'Token refreshed successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  // Logout user
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      // Delete session
      await sessionService.deleteSession(req.user.id);
      
      // Delete refresh token if provided
      if (refreshToken) {
        await sessionService.deleteRefreshToken(refreshToken);
      }
      
      res.json(formatApiResponse(
        true,
        null,
        'Logged out successfully'
      ));
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;
