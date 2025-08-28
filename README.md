# Naagrik Backend API

A comprehensive civic engagement platform backend built with Node.js, Express, and PostgreSQL.

## 🚀 Features

- **User Management**: Registration, authentication, profile management
- **Issue Tracking**: Create, manage, and track civic issues
- **Gamification**: Reputation system, badges, and leaderboards
- **Role-Based Access**: Citizens, Stewards, and Super Admins
- **Voting System**: Upvote/downvote issues
- **Comments**: Community discussion on issues
- **Steward Applications**: Apply and manage steward roles
- **Admin Zone Management**: Geographic zone assignments
- **Comprehensive API**: RESTful endpoints with proper validation

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with PostGIS
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator
- **Security**: helmet, cors, rate limiting
- **Password Hashing**: bcryptjs

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd naagrik/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   
   Create a PostgreSQL database and enable required extensions:
   ```sql
   CREATE DATABASE naagrik_db;
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

5. **Run Migrations and Seed Data**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

6. **Start the Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 🗃️ Database Schema

The database includes the following main entities:

- **users**: User accounts with roles and reputation
- **issues**: Civic issues reported by users
- **comments**: Comments on issues
- **issue_votes**: User votes on issues
- **badges**: Achievement badges
- **user_badges**: User badge assignments
- **steward_applications**: Steward role applications
- **admin_zones**: Geographic administrative zones
- **steward_notes**: Internal steward notes on issues

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/refresh` - Refresh token

### Users
- `GET /api/users/leaderboard` - Get user leaderboard
- `GET /api/users/:id` - Get user profile
- `GET /api/users/:id/badges` - Get user badges
- `GET /api/users/search` - Search users

### Issues
- `GET /api/issues` - Get issues with filtering
- `POST /api/issues` - Create new issue
- `GET /api/issues/:id` - Get issue details
- `PUT /api/issues/:id/status` - Update issue status (Steward+)
- `POST /api/issues/:issueId/vote` - Vote on issue
- `POST /api/issues/:id/mark-duplicate` - Mark as duplicate (Steward+)
- `POST /api/issues/find-similar` - Find similar issues (AI-ready)

### Comments
- `GET /api/comments/issues/:issueId/comments` - Get issue comments
- `POST /api/comments/issues/:issueId/comments` - Add comment
- `PUT /api/comments/:commentId` - Update comment
- `DELETE /api/comments/:commentId` - Delete comment

### Stewards
- `POST /api/stewards/applications` - Submit steward application
- `GET /api/stewards/applications/me` - Get my application
- `PUT /api/stewards/applications/:id/review` - Review application (Admin)
- `POST /api/stewards/issues/:issueId/notes` - Add steward note
- `GET /api/stewards/` - Get all stewards (Admin)

## 🛡️ Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **Input Validation**: Comprehensive validation using express-validator
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Proper cross-origin resource sharing
- **Helmet Security**: Security headers and protection
- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based authentication

## 🎮 Gamification System

### Reputation Points
Users earn reputation through various actions:
- Issue created: +5 points
- Issue upvoted: +2 points (to issue creator)
- Issue downvoted: -1 point (to issue creator)
- Comment created: +1 point
- Issue resolved: +10 points (to issue creator)
- Duplicate reported: +3 points

### Badges
Automatic badge assignment based on reputation:
- New Reporter (0 points)
- Active Citizen (50 points)
- Community Helper (100 points)
- Civic Champion (250 points)
- Change Maker (500 points)
- Community Leader (1000 points)
- Civic Hero (2500 points)
- Super Citizen (5000 points)

## 🔧 Configuration

Key environment variables:

```env
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=naagrik_db
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📝 API Response Format

All API responses follow a consistent format:

```json
{
  "success": true|false,
  "data": {}, // Response data
  "message": "Description",
  "pagination": { // For paginated responses
    "currentPage": 1,
    "totalPages": 10,
    "pageSize": 10,
    "totalCount": 100,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🚧 Development

### Running Tests
```bash
npm test
```

### Code Structure
```
backend/
├── config/          # Database and configuration
├── controllers/     # Route handlers
├── middleware/      # Custom middleware
├── routes/          # Route definitions
├── services/        # Business logic
├── scripts/         # Database scripts
└── utils/           # Helper functions
```

### Adding New Features

1. **Create Service**: Add business logic in `services/`
2. **Create Controller**: Add route handlers in `controllers/`
3. **Add Routes**: Define endpoints in `routes/`
4. **Add Validation**: Create validation rules in `middleware/validation.js`
5. **Update Documentation**: Update this README

## 🔮 Future Enhancements

- **AI Integration**: Vector similarity search for duplicate detection
- **File Upload**: Image/video attachment support
- **Real-time Updates**: WebSocket integration
- **Mobile Push Notifications**: Firebase integration
- **Advanced Analytics**: Comprehensive reporting dashboard
- **Multi-language Support**: Internationalization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please contact the development team or create an issue in the repository.
