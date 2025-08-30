const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Import middleware
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound, requestLogger } = require('./middleware/errors');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const issueRoutes = require('./routes/issues');
const commentRoutes = require('./routes/comments');
const stewardRoutes = require('./routes/stewards');

// Import database
const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Custom request logger
app.use(requestLogger);

// Rate limiting
app.use(generalLimiter);

// Trust proxy for proper IP detection
app.set('trust proxy', 1);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Naagrik API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
const uploadRoutes = require('./routes/upload');
const dashboardRoutes = require('./routes/dashboard');
const zoneRoutes = require('./routes/zones');
const badgeRoutes = require('./routes/badges');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/stewards', stewardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/badges', badgeRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Naagrik API - Civic Issues Management Platform',
    version: '1.0.0',
    documentation: '/api/docs',
    status: 'Production Ready',
    features: [
      'Issue Reporting & Management',
      'User Authentication & Authorization', 
      'Steward Management System',
      'Admin Panel & Analytics',
      'Badge & Reputation System',
      'Geographic Zone Management',
      'Advanced Filtering & Search',
      'Real-time Dashboard Analytics'
    ],
    endpoints: {
      // Authentication & User Management
      auth: {
        path: '/api/auth',
        description: 'User authentication, registration, login'
      },
      users: {
        path: '/api/users',
        description: 'User profiles, leaderboard, admin user management'
      },
      
      // Core Features
      issues: {
        path: '/api/issues',
        description: 'Issue reporting, management, filtering, analytics'
      },
      comments: {
        path: '/api/comments',
        description: 'Issue comments and discussions'
      },
      upload: {
        path: '/api/upload',
        description: 'Media upload for issues (images, videos)'
      },
      
      // Steward System
      stewards: {
        path: '/api/stewards',
        description: 'Steward applications, zone assignments, management'
      },
      
      // Admin Panel
      dashboard: {
        path: '/api/dashboard',
        description: 'Analytics, statistics, performance metrics'
      },
      zones: {
        path: '/api/zones',
        description: 'Administrative zone management'
      },
      badges: {
        path: '/api/badges',
        description: 'Badge system and reputation management'
      }
    },
    quickStart: {
      publicEndpoints: [
        'GET /health',
        'GET /api/dashboard/public/stats',
        'GET /api/badges',
        'GET /api/issues/analytics/statistics',
        'GET /api/issues/analytics/trending'
      ],
      authenticationRequired: [
        'POST /api/issues',
        'GET /api/dashboard/steward/*',
        'GET /api/dashboard/admin/*',
        'POST /api/stewards/applications'
      ],
      adminOnly: [
        'POST /api/zones',
        'POST /api/badges',
        'PUT /api/users/*/role',
        'GET /api/users/admin/*'
      ]
    },
    contact: {
      repository: 'https://github.com/amlesh-kumar01/naagrik-backend',
      documentation: 'See COMPLETE_API_DOCUMENTATION.md for full API reference'
    }
  });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Naagrik API Documentation',
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    
    overview: {
      description: 'Comprehensive civic issues management platform with admin panel',
      architecture: 'REST API with JWT authentication and role-based access control',
      database: 'PostgreSQL with PostGIS for geographic data',
      caching: 'Redis for performance optimization',
      security: 'JWT tokens, rate limiting, input validation'
    },
    
    authentication: {
      type: 'Bearer Token (JWT)',
      header: 'Authorization: Bearer <token>',
      roles: ['CITIZEN', 'STEWARD', 'SUPER_ADMIN'],
      endpoints: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh'
      }
    },
    
    categories: {
      'Issue Management': {
        endpoints: [
          'GET /api/issues - List issues with filtering',
          'POST /api/issues - Create new issue',
          'GET /api/issues/filter/advanced - Advanced filtering',
          'GET /api/issues/analytics/trending - Trending issues',
          'PUT /api/issues/bulk/status - Bulk status update'
        ]
      },
      
      'User Management': {
        endpoints: [
          'GET /api/users/leaderboard - User leaderboard',
          'GET /api/users/admin/filtered - Admin user filtering',
          'PUT /api/users/{id}/reputation - Update reputation',
          'PUT /api/users/bulk/role - Bulk role update'
        ]
      },
      
      'Steward System': {
        endpoints: [
          'POST /api/stewards/applications - Submit application',
          'GET /api/stewards/applications/pending - Pending applications',
          'POST /api/stewards/assignments - Assign to zone',
          'GET /api/stewards/stats/me - My steward stats'
        ]
      },
      
      'Admin Panel': {
        endpoints: [
          'GET /api/dashboard/admin/overview - Admin dashboard',
          'POST /api/zones - Create admin zone',
          'POST /api/badges - Create badge',
          'GET /api/dashboard/admin/steward-performance - Performance metrics'
        ]
      },
      
      'Analytics & Dashboard': {
        endpoints: [
          'GET /api/dashboard/public/stats - Public statistics',
          'GET /api/dashboard/trends - Issue trends',
          'GET /api/dashboard/categories - Category stats',
          'GET /api/issues/analytics/statistics - Issue analytics'
        ]
      }
    },
    
    features: {
      filtering: {
        description: 'Advanced filtering for issues and users',
        parameters: ['status', 'location', 'category', 'priority', 'dateRange', 'search'],
        example: '/api/issues/filter/advanced?status=OPEN&priority=votes&lat=40.7128&lng=-74.0060&radius=5000'
      },
      
      bulkOperations: {
        description: 'Bulk operations for admin efficiency',
        available: ['Issue status updates', 'User role updates', 'Badge assignments']
      },
      
      realTimeAnalytics: {
        description: 'Cached analytics with real-time updates',
        caching: 'Redis with TTL-based invalidation',
        metrics: ['System stats', 'User activity', 'Steward performance', 'Issue trends']
      },
      
      geographicFeatures: {
        description: 'PostGIS-powered location features',
        capabilities: ['Zone-based assignment', 'Radius filtering', 'Geographic analytics']
      }
    },
    
    responseFormat: {
      success: {
        success: true,
        data: '// Response data',
        message: 'Operation completed successfully',
        timestamp: '2025-08-30T...'
      },
      error: {
        success: false,
        error: {
          message: 'Error description',
          code: 'ERROR_CODE',
          details: {}
        },
        timestamp: '2025-08-30T...'
      }
    },
    
    rateLimiting: {
      general: '1000 requests/hour per IP',
      authentication: '5 login attempts per 15 minutes',
      issueCreation: '10 issues/hour per user',
      voting: '100 votes/hour per user'
    },
    
    fullDocumentation: 'See docs/COMPLETE_API_DOCUMENTATION.md for detailed API reference'
  });
});

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  // Close database connections
  await pool.end();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  
  // Close database connections
  await pool.end();
  
  process.exit(0);
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log('🚀 Naagrik API Server Started');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API URL: http://localhost:${PORT}`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🛠️  Development mode - detailed logging enabled');
    }
  });
}

module.exports = app;
