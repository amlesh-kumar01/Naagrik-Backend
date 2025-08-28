const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { handleValidationErrors } = require('../middleware/errors');
const { registerValidation, loginValidation } = require('../middleware/validation');

// Public routes
router.post('/register', 
  authLimiter,
  registerValidation,
  handleValidationErrors,
  authController.register
);

router.post('/login', 
  authLimiter,
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
  authenticateToken,
  authController.refreshToken
);

module.exports = router;
