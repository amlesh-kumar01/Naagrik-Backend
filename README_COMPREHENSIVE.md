# 🚀 Naagrik Backend API

A comprehensive civic engagement platform backend built with Node.js, Express, and PostgreSQL. Naagrik enables citizens to report civic issues, vote on them, comment, and allows stewards to manage and resolve issues efficiently.

## 🌟 Features

- **👥 User Management**: Registration, authentication, role-based access control
- **📋 Issue Reporting**: Create, manage, and track civic issues with geolocation
- **🗳️ Voting System**: Citizens can vote on issues to prioritize them
- **💬 Comments**: Discussion system for issues
- **🛡️ Steward System**: Special role for managing and resolving issues
- **🏆 Gamification**: Badges and reputation system
- **📤 File Uploads**: Image and video upload with Cloudinary integration
- **🔍 Search & Filtering**: Advanced search and filtering capabilities
- **📊 Analytics**: User statistics and leaderboards
- **🔐 Security**: Rate limiting, input validation, and secure authentication

## 🏗️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with PostGIS for geolocation
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary for images and videos
- **Testing**: Jest with Supertest
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting
- **Documentation**: Comprehensive API docs and Postman collection

## 🚦 Quick Start

### Prerequisites
- Node.js (>=16.0.0)
- PostgreSQL (>=12.0) with PostGIS extension
- NPM or Yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd naagrik-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```bash
   # Database
   DATABASE_URL=postgresql://username:password@host:port/database
   
   # JWT
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=7d
   
   # Cloudinary (for file uploads)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # Server
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

4. **Set up the database**
   ```bash
   # Run migrations and seed initial data
   npm run db:setup
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

The API will be available at `http://localhost:5000`

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with detailed output
npm run test:verbose

# Run specific test file
npm test -- auth.test.js
```

### Test Coverage
Our test suite includes:
- ✅ Authentication endpoints
- ✅ Issues CRUD operations
- ✅ Comments system
- ✅ User management
- ✅ Steward functionality
- ✅ File upload system
- ✅ Error handling
- ✅ Rate limiting
- ✅ Security features

### Test Structure
```
tests/
├── setup.js              # Test utilities and database setup
├── auth.test.js          # Authentication tests
├── issues.test.js        # Issues functionality tests
├── comments.test.js      # Comments system tests
├── users.test.js         # User management tests
├── stewards.test.js      # Steward functionality tests
├── upload.test.js        # File upload tests
└── health.test.js        # Health check and basic endpoint tests
```

## 📊 API Documentation

### Available Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/health` | GET | Health check | No |
| `/api/auth/register` | POST | User registration | No |
| `/api/auth/login` | POST | User login | No |
| `/api/auth/me` | GET | Get current user | Yes |
| `/api/issues` | GET | Get all issues | No |
| `/api/issues` | POST | Create new issue | Yes |
| `/api/issues/:id` | GET | Get issue details | No |
| `/api/issues/:id/vote` | POST | Vote on issue | Yes |
| `/api/issues/:id/status` | PUT | Update issue status | Steward+ |
| `/api/comments/issues/:id/comments` | GET | Get issue comments | No |
| `/api/comments/issues/:id/comments` | POST | Add comment | Yes |
| `/api/users/leaderboard` | GET | Get user leaderboard | No |
| `/api/users/:id` | GET | Get user profile | No |
| `/api/stewards/applications` | POST | Apply for steward role | Yes |
| `/api/upload/profile` | POST | Upload profile image | Yes |
| `/api/upload/issue-media` | POST | Upload issue media | Yes |

### Complete API Documentation
📖 **[View Complete API Documentation](./API_DOCUMENTATION.md)**

The complete documentation includes:
- Detailed endpoint descriptions
- Request/response examples
- Validation rules
- Error codes
- Authentication requirements
- Rate limiting information

### Postman Collection
🚀 **Import our Postman collection**: `postman_collection.json`

The Postman collection includes:
- All API endpoints with examples
- Environment variables for easy testing
- Pre-request scripts for authentication
- Test scripts for response validation

## 🏗️ Database Schema

### Key Tables

**Users**
- User accounts, profiles, roles, and reputation scores

**Issues** 
- Civic issues with geolocation, status tracking, and voting

**Comments**
- User comments on issues with moderation flags

**Issue Votes**
- User voting records (upvote/downvote) for issues

**Steward Applications**
- Applications to become a steward with approval workflow

**Badges**
- Achievement system with automatic badge awarding

**Admin Zones**
- Geographic zones for steward assignments

### Database Commands
```bash
# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Full setup (migrate + seed)
npm run db:setup
```

## 🔐 Authentication & Authorization

### User Roles
- **CITIZEN** (default): Create issues, vote, comment
- **STEWARD**: Manage issues, update status, add private notes
- **SUPER_ADMIN**: Full system access, user management

### JWT Token
Include in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Demo Accounts (after seeding)
- **Admin**: `admin@naagrik.com` / `admin123`
- **Demo Users**: Various test accounts with password `demo123`

## 🛡️ Security Features

- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Comprehensive validation using express-validator
- **CORS**: Configured for frontend integration
- **Helmet**: Security headers
- **JWT Authentication**: Secure token-based auth
- **SQL Injection Protection**: Parameterized queries
- **File Upload Security**: Type and size validation

## 🚀 Performance Features

- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connections
- **Pagination**: All list endpoints support pagination
- **Compression**: GZIP compression for responses
- **Error Handling**: Comprehensive error handling and logging
- **Graceful Shutdown**: Proper cleanup on server shutdown

## 📁 Project Structure

```
naagrik-backend/
├── config/
│   └── database.js           # Database configuration
├── controllers/              # Request handlers
│   ├── authController.js
│   ├── issueController.js
│   ├── commentController.js
│   ├── userController.js
│   ├── stewardController.js
│   └── uploadController.js
├── middleware/               # Custom middleware
│   ├── auth.js              # Authentication middleware
│   ├── errors.js            # Error handling
│   ├── rateLimiter.js       # Rate limiting
│   └── validation.js        # Input validation
├── routes/                  # API routes
│   ├── auth.js
│   ├── issues.js
│   ├── comments.js
│   ├── users.js
│   ├── stewards.js
│   └── upload.js
├── scripts/                 # Database scripts
│   ├── migrate.js           # Database migrations
│   ├── seed.js              # Seed data
│   └── cli.js               # CLI utilities
├── services/                # Business logic
├── tests/                   # Test suites
├── utils/                   # Utility functions
├── server.js               # Main server file
├── package.json
├── jest.config.js          # Test configuration
├── API_DOCUMENTATION.md    # Complete API docs
├── postman_collection.json # Postman collection
└── README.md               # This file
```

## 🧩 API Integration Examples

### Register a new user
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'Password123',
    fullName: 'John Doe'
  })
});
const { token, user } = await response.json();
```

### Create an issue
```javascript
const response = await fetch('/api/issues', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Pothole on Main Street',
    description: 'Large pothole causing vehicle damage',
    categoryId: 1,
    locationLat: 12.9716,
    locationLng: 77.5946,
    address: 'Main Street, Bangalore'
  })
});
const { issue } = await response.json();
```

### Vote on an issue
```javascript
const response = await fetch(`/api/issues/${issueId}/vote`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ voteType: 1 }) // 1 for upvote, -1 for downvote
});
```

## 📈 Monitoring & Logging

### Health Check
GET `/health` - Check if API is running
```json
{
  "success": true,
  "message": "Naagrik API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

### Request Logging
- All requests are logged in development mode
- Error tracking and monitoring
- Performance metrics for database queries

## 🔧 Development

### Available Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with auto-reload
npm test           # Run test suite
npm run test:watch # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run db:migrate # Run database migrations
npm run db:seed    # Seed database with initial data
npm run db:setup   # Full database setup
```

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Write** tests for new functionality
4. **Implement** the feature
5. **Ensure** all tests pass (`npm test`)
6. **Commit** changes (`git commit -m 'Add amazing feature'`)
7. **Push** to branch (`git push origin feature/amazing-feature`)
8. **Create** a Pull Request

### Code Style
- Use ESLint for code formatting
- Follow RESTful API conventions
- Write comprehensive tests for new features
- Include JSDoc comments for functions
- Use meaningful commit messages

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Issues**: Report bugs or request features via GitHub issues
2. **Pull Requests**: Submit PRs with clear descriptions
3. **Testing**: Ensure all tests pass and add tests for new features
4. **Documentation**: Update documentation for API changes

### Development Setup
```bash
# Install dependencies
npm install

# Set up pre-commit hooks (optional)
npm run prepare

# Run development server
npm run dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **PostGIS** for geospatial capabilities
- **Cloudinary** for media management
- **JWT** for secure authentication
- **Express** ecosystem for robust middleware
- **Jest** for comprehensive testing

## 📞 Support

- **Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**Built with ❤️ for better civic engagement**
