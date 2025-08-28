const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const rateLimitService = require('../services/rateLimitService');
const { handleValidationErrors } = require('../middleware/errors');
const { registerValidation, loginValidation, refreshTokenValidation } = require('../middleware/validation');

// Public routes
router.post('/register', 
  rateLimitService.authRateLimit(),
  registerValidation,
  handleValidationErrors,
  authController.register
);

router.post('/login', 
  rateLimitService.authRateLimit(),
  loginValidation,
  handleValidationErrors,
  authController.login
);

// Protected routes
router.get('/me', 
  authenticateToken,
  authController.getMe
);

router.post('/refresh', 
  rateLimitService.authRateLimit(),
  refreshTokenValidation,
  handleValidationErrors,
  authController.refreshToken
);

router.post('/logout', 
  authenticateToken,
  authController.logout
);

module.exports = router;
