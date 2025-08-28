const userService = require('../services/userService');
const { generateToken, formatApiResponse } = require('../utils/helpers');

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
      
      // Generate token
      const token = generateToken(user.id);
      
      res.status(201).json(formatApiResponse(
        true,
        { user, token },
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
      
      // Generate token
      const token = generateToken(user.id);
      
      res.json(formatApiResponse(
        true,
        { user, token },
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
      const user = await userService.findById(req.user.id);
      if (!user) {
        return res.status(404).json(formatApiResponse(
          false,
          null,
          'User not found'
        ));
      }
      
      const token = generateToken(user.id);
      
      res.json(formatApiResponse(
        true,
        { token },
        'Token refreshed successfully'
      ));
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;
