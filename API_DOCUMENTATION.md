# 🚀 Naagrik Backend API Documentation

## Overview
Naagrik is a comprehensive civic engagement platform backend built with Node.js, Express, and PostgreSQL. This API enables citizens to report civic issues, vote on them, comment, and allows stewards to manage and resolve issues.

## 🔧 Setup & Installation

### Prerequisites
- Node.js (>=16.0.0)
- PostgreSQL (>=12.0)
- NPM or Yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd naagrik-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run migrations and seed data
npm run db:migrate
npm run db:seed

# Start the server
npm run dev
```

### Environment Variables
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database
# OR use individual variables:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=naagrik_db
DB_USER=postgres
DB_PASSWORD=password
DB_SSL=false

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Other configurations
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.js

# Run tests in watch mode
npm run test:watch
```

### Test Structure
- `tests/setup.js` - Test utilities and database setup
- `tests/*.test.js` - Individual test suites for each module

## 📊 API Endpoints

### Base URL
- **Development**: `http://localhost:5000`
- **Production**: `https://your-api-domain.com`

### Authentication
Most endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication Endpoints

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "fullName": "John Doe"
}
```

**Validation Rules:**
- `email`: Valid email format, will be normalized
- `password`: Minimum 6 characters, must contain lowercase, uppercase, and number
- `fullName`: 2-100 characters, letters and spaces only

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "CITIZEN",
    "reputation_score": 0,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Validation errors
- `409`: Email already exists

---

### POST /api/auth/login
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "CITIZEN",
    "reputation_score": 15
  }
}
```

**Error Responses:**
- `400`: Validation errors
- `401`: Invalid credentials

---

### GET /api/auth/me
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "CITIZEN",
    "reputation_score": 15,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `401`: Invalid or missing token

---

## 📋 Issues Endpoints

### GET /api/issues
Get paginated list of issues with optional filters.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (1-100, default: 20)
- `status` (optional): Filter by status (OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, ARCHIVED, DUPLICATE)
- `categoryId` (optional): Filter by category ID
- `userId` (optional): Filter by user ID
- `search` (optional): Search in title/description

**Example:**
```
GET /api/issues?page=1&limit=10&status=OPEN&categoryId=1&search=road
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "id": "uuid",
        "title": "Pothole on Main Street",
        "description": "Large pothole causing damage to vehicles",
        "status": "OPEN",
        "location_lat": 12.9716,
        "location_lng": 77.5946,
        "address": "Main Street, Bangalore",
        "category_id": 1,
        "category_name": "Road Issues",
        "user_id": "uuid",
        "user_name": "John Doe",
        "vote_score": 15,
        "thumbnail_url": "https://cloudinary.com/image.jpg",
        "media_count": 3,
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 89,
      "limit": 20,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### GET /api/issues/categories
Get all issue categories.

**Response (200):**
```json
{
  "success": true,
  "categories": [
    {
      "id": 1,
      "name": "Road Issues",
      "description": "Problems related to roads and transportation"
    },
    {
      "id": 2,
      "name": "Water Problems",
      "description": "Water supply and drainage issues"
    }
  ]
}
```

---

### GET /api/issues/:id
Get detailed information about a specific issue.

**Response (200):**
```json
{
  "success": true,
  "issue": {
    "id": "uuid",
    "title": "Pothole on Main Street",
    "description": "Large pothole causing damage to vehicles",
    "status": "OPEN",
    "location_lat": 12.9716,
    "location_lng": 77.5946,
    "address": "Main Street, Bangalore",
    "category_id": 1,
    "category_name": "Road Issues",
    "user_id": "uuid",
    "user_name": "John Doe",
    "vote_score": 15,
    "user_vote": 1,
    "thumbnail_url": "https://cloudinary.com/image.jpg",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "resolved_at": null,
    "media": [
      {
        "id": "uuid",
        "media_url": "https://cloudinary.com/image1.jpg",
        "media_type": "IMAGE",
        "is_thumbnail": true,
        "moderation_status": "APPROVED",
        "created_at": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": "uuid",
        "media_url": "https://cloudinary.com/video1.mp4",
        "media_type": "VIDEO",
        "is_thumbnail": false,
        "moderation_status": "APPROVED",
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

**Error Responses:**
- `404`: Issue not found

---

### POST /api/issues
Create a new issue (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Broken streetlight on Park Avenue",
  "description": "The streetlight has been broken for over a week, making the area unsafe at night.",
  "categoryId": 3,
  "locationLat": 12.9716,
  "locationLng": 77.5946,
  "address": "Park Avenue, Bangalore"
}
```

**Validation Rules:**
- `title`: 5-255 characters
- `description`: 10-2000 characters
- `categoryId`: Valid category ID (integer ≥ 1)
- `locationLat`: Valid latitude (-90 to 90)
- `locationLng`: Valid longitude (-180 to 180)
- `address`: Optional, max 500 characters

**Response (201):**
```json
{
  "success": true,
  "message": "Issue created successfully",
  "issue": {
    "id": "uuid",
    "title": "Broken streetlight on Park Avenue",
    "description": "The streetlight has been broken for over a week...",
    "status": "OPEN",
    "location_lat": 12.9716,
    "location_lng": 77.5946,
    "address": "Park Avenue, Bangalore",
    "category_id": 3,
    "user_id": "uuid",
    "vote_score": 0,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Validation errors
- `401`: Authentication required

---

### POST /api/issues/:issueId/vote
Vote on an issue (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "voteType": 1
}
```

**Validation:**
- `voteType`: Must be 1 (upvote) or -1 (downvote)

**Response (200):**
```json
{
  "success": true,
  "message": "Vote recorded successfully",
  "voteScore": 16,
  "userVote": 1
}
```

**Error Responses:**
- `400`: Invalid vote type
- `401`: Authentication required
- `404`: Issue not found

---

### PUT /api/issues/:id/status
Update issue status (requires Steward or Admin role).

**Headers:**
```
Authorization: Bearer <steward-or-admin-token>
```

**Request Body:**
```json
{
  "status": "ACKNOWLEDGED",
  "reason": "Issue has been reviewed and will be addressed"
}
```

**Validation:**
- `status`: Must be one of: OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, ARCHIVED
- `reason`: Optional, max 500 characters

**Response (200):**
```json
{
  "success": true,
  "message": "Issue status updated successfully",
  "issue": {
    "id": "uuid",
    "status": "ACKNOWLEDGED",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Validation errors
- `401`: Authentication required
- `403`: Insufficient permissions
- `404`: Issue not found

---

### DELETE /api/issues/:id
Delete an issue (only by issue creator or admin).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Issue deleted successfully"
}
```

**Error Responses:**
- `401`: Authentication required
- `403`: Insufficient permissions
- `404`: Issue not found

---

### POST /api/issues/:issueId/media
Add media to an existing issue (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "mediaUrl": "https://cloudinary.com/new-image.jpg",
  "mediaType": "IMAGE",
  "isThumbnail": false
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "media": {
      "id": "uuid",
      "issue_id": "uuid",
      "user_id": "uuid",
      "media_url": "https://cloudinary.com/new-image.jpg",
      "media_type": "IMAGE",
      "is_thumbnail": false,
      "moderation_status": "APPROVED",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "Media added to issue successfully"
}
```

---

### PUT /api/issues/:issueId/thumbnail
Update the thumbnail for an issue (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "thumbnailUrl": "https://cloudinary.com/new-thumbnail.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "result": "thumbnail updated"
  },
  "message": "Issue thumbnail updated successfully"
}
```

---

### DELETE /api/issues/media/:mediaId
Remove media from an issue (requires authentication - only by media uploader).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "removedMedia": {
      "id": "uuid",
      "media_url": "https://cloudinary.com/removed-image.jpg",
      "media_type": "IMAGE"
    }
  },
  "message": "Media removed from issue successfully"
}
```

**Error Responses:**
- `401`: Authentication required
- `404`: Media not found or insufficient permissions

---

## 💬 Comments Endpoints

### GET /api/comments/issues/:issueId/comments
Get all comments for a specific issue.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (200):**
```json
{
  "success": true,
  "comments": [
    {
      "id": "uuid",
      "content": "This issue affects my daily commute",
      "user_id": "uuid",
      "user_name": "Jane Smith",
      "issue_id": "uuid",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalItems": 15
  }
}
```

---

### POST /api/comments/issues/:issueId/comments
Add a comment to an issue (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "I have also noticed this issue in the area."
}
```

**Validation:**
- `content`: 1-1000 characters

**Response (201):**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "comment": {
    "id": "uuid",
    "content": "I have also noticed this issue in the area.",
    "user_id": "uuid",
    "issue_id": "uuid",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### PUT /api/comments/:commentId
Update a comment (only by comment author).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "Updated comment content"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Comment updated successfully",
  "comment": {
    "id": "uuid",
    "content": "Updated comment content",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### DELETE /api/comments/:commentId
Delete a comment (only by comment author or admin).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

---

## 👥 Users Endpoints

### GET /api/users/leaderboard
Get user leaderboard based on reputation scores.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page (max 100)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "full_name": "Top Contributor",
        "reputation_score": 450,
        "role": "STEWARD",
        "total_issues": 25,
        "total_comments": 89
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 50
    }
  }
}
```

---

### GET /api/users/search
Search for users (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `q`: Search query
- `limit` (optional): Max results (default: 10)

**Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "CITIZEN",
      "reputation_score": 75
    }
  ]
}
```

---

### GET /api/users/:id
Get user profile by ID.

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "CITIZEN",
    "reputation_score": 75,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### GET /api/users/:id/badges
Get user's earned badges.

**Response (200):**
```json
{
  "success": true,
  "badges": [
    {
      "id": 1,
      "name": "First Issue",
      "description": "Created your first issue",
      "icon_url": "https://example.com/badge1.png",
      "earned_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### GET /api/users/:id/stats
Get user statistics.

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "total_issues": 12,
    "total_comments": 45,
    "total_votes_given": 78,
    "total_votes_received": 134,
    "reputation_score": 75,
    "issues_by_status": {
      "OPEN": 3,
      "ACKNOWLEDGED": 4,
      "RESOLVED": 5
    }
  }
}
```

---

## 🛡️ Stewards Endpoints

### POST /api/stewards/applications
Submit application to become a steward (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "justification": "I have been an active community member for several years and have extensive experience in local governance..."
}
```

**Validation:**
- `justification`: 50-1000 characters

**Response (201):**
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "application": {
    "id": "uuid",
    "user_id": "uuid",
    "justification": "I have been an active community member...",
    "status": "PENDING",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### GET /api/stewards/applications/me
Get current user's steward application status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "application": {
    "id": "uuid",
    "status": "PENDING",
    "justification": "I have been an active community member...",
    "created_at": "2024-01-01T00:00:00.000Z",
    "reviewed_at": null,
    "feedback": null
  }
}
```

---

### GET /api/stewards/zones/me
Get steward's assigned zones (requires Steward role).

**Headers:**
```
Authorization: Bearer <steward-token>
```

**Response (200):**
```json
{
  "success": true,
  "zones": [
    {
      "id": 1,
      "name": "Downtown",
      "description": "Central business district"
    }
  ]
}
```

---

### POST /api/stewards/issues/:issueId/notes
Add a private steward note to an issue (requires Steward role).

**Headers:**
```
Authorization: Bearer <steward-token>
```

**Request Body:**
```json
{
  "note": "Issue has been escalated to maintenance department. Expected resolution within 48 hours."
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Note added successfully",
  "note": {
    "id": "uuid",
    "note": "Issue has been escalated to maintenance department...",
    "steward_id": "uuid",
    "issue_id": "uuid",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 📤 Upload Endpoints

### POST /api/upload/profile
Upload profile image (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `image`: Image file (JPEG, PNG, WebP, GIF)

**Response (200):**
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/profile/user123.jpg"
}
```

---

### POST /api/upload/issue-media
Upload media files for issues (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `media`: Up to 5 media files (images/videos)

**Response (200):**
```json
{
  "success": true,
  "message": "Media uploaded successfully",
  "mediaUrls": [
    "https://res.cloudinary.com/your-cloud/image/upload/issues/issue1.jpg",
    "https://res.cloudinary.com/your-cloud/video/upload/issues/issue1.mp4"
  ]
}
```

---

## ⚡ Error Responses

### Standard Error Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

---

## 🔒 Rate Limiting

### Limits
- **General**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Issue Creation**: 10 requests per hour
- **Voting**: 30 requests per 15 minutes

### Headers
Rate limit information is included in response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## 🎯 User Roles & Permissions

### CITIZEN (Default)
- Create and manage own issues
- Vote on issues
- Comment on issues
- View public content

### STEWARD
- All CITIZEN permissions
- Update issue status
- Mark issues as duplicate
- Add private notes to issues
- View steward statistics

### SUPER_ADMIN
- All STEWARD permissions
- Manage user roles
- Review steward applications
- Manage steward zone assignments
- Access all administrative functions

---

## 📊 Database Schema

### Key Tables
- `users`: User accounts and profiles
- `issues`: Civic issues with geolocation
- `comments`: User comments on issues
- `issue_votes`: User votes on issues
- `steward_applications`: Applications to become steward
- `badges`: Achievement system
- `admin_zones`: Geographic administrative zones

---

## 🚀 Performance Features

- **Database Indexing**: Optimized queries with proper indexes
- **Pagination**: All list endpoints support pagination
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **Caching**: Response caching for frequently accessed data
- **Compression**: GZIP compression for reduced bandwidth
- **Connection Pooling**: Efficient database connection management

---

## 🔧 Development

### Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run test suite
npm run db:migrate # Run database migrations
npm run db:seed    # Seed database with initial data
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure database connection
3. Set JWT secret
4. Configure Cloudinary for file uploads
5. Run migrations and seed data

---

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details.
