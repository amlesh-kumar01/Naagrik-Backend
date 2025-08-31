# Naagrik API Documentation v2.0
## Zone Selection & Category-Based Steward Management System

### Overview
This API powers the Naagrik civic issues management platform with a simplified zone selection system. Users select zones when reporting issues, and stewards are assigned to specific categories within zones for efficient issue management.

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 🔐 Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "phoneNumber": "+91-9876543210",
  "address": "123 Main Street, City",
  "occupation": "Software Engineer",
  "organization": "Tech Corp",
  "dateOfBirth": "1990-01-15",
  "gender": "male",
  "preferences": {
    "emailNotifications": true,
    "smsNotifications": false
  }
}
```

**Validation Rules:**
- `email`: Valid email format, unique
- `password`: Minimum 6 characters
- `fullName`: 1-100 characters
- `phoneNumber`: Valid phone format (optional)
- `dateOfBirth`: Valid date format (optional)
- `gender`: One of 'male', 'female', 'other' (optional)

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "CITIZEN"
    },
    "token": "jwt_token"
  }
}
```

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "CITIZEN"
    },
    "token": "jwt_token"
  }
}
```

### GET /auth/me
Get current user profile (requires authentication).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "CITIZEN",
      "phoneNumber": "+91-9876543210",
      "address": "123 Main Street, City",
      "occupation": "Software Engineer",
      "organization": "Tech Corp",
      "dateOfBirth": "1990-01-15",
      "gender": "male",
      "preferences": {
        "emailNotifications": true,
        "smsNotifications": false
      },
      "createdAt": "2025-08-31T12:00:00.000Z"
    }
  }
}
```

### POST /auth/refresh
Refresh JWT token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

### POST /auth/logout
Logout and invalidate token (requires authentication).

---

## 🏢 Zone Management Endpoints

### GET /zones/public/available
Get all available zones for issue creation (public endpoint).

**Query Parameters:**
- `search` (optional): Search zones by area name or pincode

**Response (200):**
```json
{
  "success": true,
  "data": {
    "zones": [
      {
        "id": "uuid",
        "areaName": "IIT Kharagpur Main Campus",
        "state": "West Bengal",
        "district": "West Midnapore",
        "pincode": "721302",
        "createdAt": "2025-08-31T12:00:00.000Z"
      }
    ]
  }
}
```

### GET /zones/public/search
Search zones by query string (public endpoint).

**Query Parameters:**
- `q`: Search query string

### GET /zones/categories
Get all issue categories (public endpoint).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "uuid",
        "name": "Infrastructure",
        "description": "Roads, buildings, utilities",
        "createdAt": "2025-08-31T12:00:00.000Z"
      }
    ]
  }
}
```

## Admin Zone Management (Requires Admin Role)

### POST /zones
Create a new zone.

**Request Body:**
```json
{
  "areaName": "New Area",
  "state": "State Name",
  "district": "District Name",
  "pincode": "123456"
}
```

### GET /zones
Get all zones (admin only).

### PUT /zones/:id
Update zone details.

### DELETE /zones/:id
Delete a zone.

---

## 🚨 Issue Management Endpoints

### GET /issues
Get all issues with optional filtering.

**Query Parameters:**
- `category`: Filter by category ID
- `zone`: Filter by zone ID
- `status`: Filter by status (OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, ARCHIVED)
- `priority`: Filter by priority (LOW, MEDIUM, HIGH, URGENT)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Sort field (createdAt, votes, priority)
- `sortOrder`: Sort order (asc, desc)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "id": "uuid",
        "title": "Broken Street Light",
        "description": "Street light is not working",
        "status": "OPEN",
        "priority": "MEDIUM",
        "category": {
          "id": "uuid",
          "name": "Infrastructure"
        },
        "zone": {
          "id": "uuid",
          "areaName": "IIT Kharagpur",
          "pincode": "721302"
        },
        "creator": {
          "id": "uuid",
          "fullName": "John Doe"
        },
        "location": {
          "latitude": 22.3149,
          "longitude": 87.3105,
          "address": "Main Road, IIT Kharagpur"
        },
        "voteCount": 5,
        "commentCount": 3,
        "media": [],
        "createdAt": "2025-08-31T12:00:00.000Z",
        "updatedAt": "2025-08-31T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### POST /issues
Create a new issue (requires authentication).

**Request Body:**
```json
{
  "title": "Issue Title",
  "description": "Detailed description of the issue",
  "categoryId": "uuid",
  "zoneId": "uuid",
  "priority": "MEDIUM",
  "locationLat": 22.3149,
  "locationLng": 87.3105,
  "address": "Specific location address"
}
```

**Validation Rules:**
- `title`: 5-200 characters
- `description`: 10-2000 characters
- `categoryId`: Valid UUID, must exist
- `zoneId`: Valid UUID, must exist
- `priority`: One of LOW, MEDIUM, HIGH, URGENT
- `locationLat`: Latitude between -90 and 90
- `locationLng`: Longitude between -180 and 180
- `address`: 5-300 characters

### GET /issues/:id
Get specific issue details.

### GET /issues/categories
Get all issue categories.

### GET /issues/my/issues
Get current user's issues (requires authentication).

### PUT /issues/:id/status
Update issue status (requires steward with category access).

**Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "reason": "Starting to work on this issue"
}
```

**Valid Status Transitions:**
- OPEN → ACKNOWLEDGED, IN_PROGRESS, DUPLICATE, ARCHIVED
- ACKNOWLEDGED → IN_PROGRESS, RESOLVED, DUPLICATE, ARCHIVED
- IN_PROGRESS → RESOLVED, OPEN, ARCHIVED
- RESOLVED → ARCHIVED, OPEN (if reopened)

### POST /issues/:issueId/vote
Vote on an issue (requires authentication).

**Request Body:**
```json
{
  "voteType": 1
}
```
- `voteType`: 1 for upvote, -1 for downvote

### GET /issues/:issueId/vote-status
Get current user's vote status for an issue.

### DELETE /issues/:issueId/vote
Remove vote from an issue.

### POST /issues/find-similar
Find similar issues to prevent duplicates.

**Request Body:**
```json
{
  "title": "Issue title to check",
  "description": "Issue description",
  "categoryId": "uuid",
  "zoneId": "uuid"
}
```

### DELETE /issues/:issueId/hard-delete
Permanently delete an issue (admin only).

---

## 👨‍💼 Steward Management Endpoints

### POST /stewards/applications
Submit steward application (requires authentication).

**Request Body:**
```json
{
  "motivation": "Why I want to be a steward",
  "experience": "Relevant experience",
  "categories": ["uuid1", "uuid2"],
  "zones": ["uuid1", "uuid2"]
}
```

### GET /stewards/applications/me
Get current user's steward application status.

### GET /stewards/categories/me
Get categories assigned to current steward (requires steward role).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "uuid",
        "name": "Infrastructure",
        "zone": {
          "id": "uuid",
          "areaName": "IIT Kharagpur",
          "pincode": "721302"
        },
        "assignedAt": "2025-08-31T12:00:00.000Z"
      }
    ]
  }
}
```

### GET /stewards/issues/me
Get issues assigned to current steward's categories.

### GET /stewards/workload/:stewardId?
Get steward workload statistics.

## Admin Steward Management (Requires Admin Role)

### GET /stewards/applications
Get all steward applications.

### PUT /stewards/applications/:applicationId/review
Review steward application.

**Request Body:**
```json
{
  "status": "APPROVED",
  "reviewNotes": "Application approved"
}
```

### POST /stewards/assignments/category
Assign steward to category in specific zone.

**Request Body:**
```json
{
  "stewardId": "uuid",
  "categoryId": "uuid", 
  "zoneId": "uuid",
  "notes": "Assignment notes"
}
```

### DELETE /stewards/assignments/:assignmentId
Remove steward from category assignment.

### POST /stewards/assignments/bulk
Bulk assign steward to multiple categories.

**Request Body:**
```json
{
  "stewardId": "uuid",
  "assignments": [
    {
      "categoryId": "uuid",
      "zoneId": "uuid"
    }
  ]
}
```

---

## 👤 User Management Endpoints

### GET /users/profile
Get current user's profile (requires authentication).

### PUT /users/profile
Update current user's profile.

**Request Body:**
```json
{
  "fullName": "Updated Name",
  "phoneNumber": "+91-9876543210",
  "address": "New Address",
  "occupation": "New Job",
  "organization": "New Company",
  "preferences": {
    "emailNotifications": true,
    "smsNotifications": true
  }
}
```

### GET /users
Get all users (admin only).

### GET /users/:id
Get specific user details (admin only).

### PUT /users/:id/role
Update user role (admin only).

**Request Body:**
```json
{
  "role": "STEWARD"
}
```

### DELETE /users/:id
Delete user account (admin only).

---

## 💬 Comment Management Endpoints

### GET /comments/issues/:issueId/comments
Get all comments for an issue.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sortBy`: Sort by createdAt or votes
- `sortOrder`: asc or desc

### POST /comments/issues/:issueId/comments
Add comment to an issue (requires authentication).

**Request Body:**
```json
{
  "content": "This is my comment on the issue"
}
```

### PUT /comments/:commentId
Update a comment (requires authentication, own comment only).

### DELETE /comments/:commentId
Delete a comment (requires authentication, own comment or admin).

### POST /comments/:commentId/flag
Flag a comment as inappropriate.

### GET /comments/flagged
Get flagged comments (admin only).

---

## 📊 Dashboard Endpoints

### GET /dashboard/admin
Get admin dashboard statistics (requires admin role).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalIssues": 45,
    "totalStewards": 12,
    "totalZones": 8,
    "issuesByStatus": {
      "OPEN": 15,
      "IN_PROGRESS": 10,
      "RESOLVED": 18,
      "ARCHIVED": 2
    },
    "issuesByCategory": {
      "Infrastructure": 20,
      "Environment": 15,
      "Safety": 10
    },
    "issuesByZone": {
      "IIT Kharagpur": 25,
      "Technology Village": 12,
      "Hijli": 8
    },
    "recentActivity": [
      {
        "type": "issue_created",
        "description": "New issue reported",
        "timestamp": "2025-08-31T12:00:00.000Z"
      }
    ]
  }
}
```

### GET /dashboard/steward
Get steward dashboard statistics (requires steward role).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "assignedCategories": 3,
    "totalIssues": 25,
    "pendingIssues": 8,
    "resolvedIssues": 15,
    "issuesRequiringAttention": 3,
    "categoryBreakdown": {
      "Infrastructure": 15,
      "Environment": 10
    }
  }
}
```

### GET /dashboard/citizen
Get citizen dashboard statistics (requires authentication).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "myIssues": 5,
    "myResolvedIssues": 3,
    "myVotes": 12,
    "myComments": 8,
    "badgesEarned": 2
  }
}
```

---

## 🏆 Badge System Endpoints

### GET /badges
Get all available badges.

### GET /badges/:id
Get specific badge details.

### POST /badges (Admin Only)
Create a new badge.

**Request Body:**
```json
{
  "name": "Community Helper",
  "description": "Awarded for helping the community",
  "criteria": "Report 5 valid issues",
  "iconUrl": "https://example.com/icon.png",
  "isActive": true
}
```

### POST /badges/award (Admin Only)
Award badge to user.

**Request Body:**
```json
{
  "userId": "uuid",
  "badgeId": "uuid",
  "reason": "Completed 5 issue reports"
}
```

---

## 📁 File Upload Endpoints

### POST /upload/single
Upload single file.

**Request:** Multipart form data with `file` field

**Response (200):**
```json
{
  "success": true,
  "data": {
    "file": {
      "id": "uuid",
      "originalName": "image.jpg",
      "url": "https://cloudinary.com/image.jpg",
      "size": 1024000,
      "mimeType": "image/jpeg"
    }
  }
}
```

### POST /upload/multiple
Upload multiple files.

---

## 🔍 Advanced Issue Features

### GET /issues/filter/advanced
Advanced issue filtering.

**Query Parameters:**
- `categories[]`: Array of category IDs
- `zones[]`: Array of zone IDs
- `statuses[]`: Array of status values
- `priorities[]`: Array of priority values
- `createdAfter`: Date filter
- `createdBefore`: Date filter
- `minVotes`: Minimum vote count
- `hasMedia`: Boolean for issues with media

### GET /issues/filter/location
Filter issues by location proximity.

**Query Parameters:**
- `lat`: Latitude
- `lng`: Longitude
- `radius`: Radius in meters (default: 1000)

### GET /issues/analytics/trending
Get trending issues.

### GET /issues/analytics/statistics
Get issue statistics.

### GET /issues/analytics/categories
Get category-wise issue analytics.

---

## 🔧 System Architecture

### Zone Selection Logic
1. **User Reports Issue**: User must select a zone from available zones
2. **No Overlap Issues**: Each issue belongs to exactly one zone
3. **Steward Assignment**: Stewards are assigned to specific categories within zones
4. **Permission Model**: Stewards can only manage issues in their assigned category-zone combinations

### Category-Based Steward System
```
Steward → Categories → Zones
  ↓
Can manage issues in assigned category-zone combinations only
```

### Database Schema Overview

#### Users Table
- Enhanced with detailed profile fields
- Phone, address, occupation, organization
- Date of birth, gender, preferences
- Profile images managed via separate media system

#### Zones Table
- Simplified without PostGIS boundaries
- Area name, state, district, pincode
- Users select zone during issue creation

#### Steward Categories Table
- Links stewards to specific categories in specific zones
- Enables fine-grained permission control
- Supports multiple zone assignments per steward

#### Issues Table
- Must include zone_id (user-selected)
- Must include category_id
- Location stored as lat/lng coordinates
- No automatic zone assignment

---

## 🚀 Status Codes & Error Handling

### Success Responses
- `200`: OK - Request successful
- `201`: Created - Resource created successfully
- `204`: No Content - Successful deletion

### Error Responses
- `400`: Bad Request - Invalid request data
- `401`: Unauthorized - Missing or invalid authentication
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `409`: Conflict - Resource already exists
- `422`: Unprocessable Entity - Validation errors
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server error

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "details": {
    "field": "Specific validation error"
  }
}
```

---

## 🔐 Authorization Matrix

| Endpoint Group | Citizen | Steward | Admin |
|----------------|---------|---------|-------|
| Auth (register, login) | ✅ | ✅ | ✅ |
| Profile management | ✅ | ✅ | ✅ |
| View issues | ✅ | ✅ | ✅ |
| Create issues | ✅ | ✅ | ✅ |
| Vote on issues | ✅ | ✅ | ✅ |
| Comment on issues | ✅ | ✅ | ✅ |
| Update issue status | ❌ | ✅* | ✅ |
| Zone management | ❌ | ❌ | ✅ |
| Steward management | ❌ | ✅** | ✅ |
| User management | ❌ | ❌ | ✅ |
| Badge management | ❌ | ❌ | ✅ |

**Notes:**
- *Stewards can only update issues in their assigned category-zone combinations
- **Stewards can view their own assignments and workload

---

## 🔄 Rate Limiting

### Authentication Endpoints
- Limit: 10 requests per 15 minutes per IP
- Applies to: register, login, refresh

### General API
- Limit: 10,000 requests per 15 minutes per IP
- Applies to: All other endpoints

### File Upload
- Limit: 100 uploads per hour per user
- Max file size: 10MB per file

---

## 🎯 Key Features

### 1. Simplified Zone Selection
- Users choose zone from dropdown during issue creation
- No complex geographic boundary calculations
- Clear zone identification by area name and pincode

### 2. Category-Based Steward Management
- Stewards assigned to specific categories within zones
- Fine-grained permission control
- Multiple zone assignments possible per steward

### 3. Enhanced User Profiles
- Comprehensive user information storage
- Separate media system for profile images
- Flexible preference management

### 4. Advanced Issue Analytics
- Trending issue detection
- Category-wise statistics
- Zone-based analytics
- Location-based filtering

### 5. Comprehensive Validation
- Input validation on all endpoints
- Business logic validation
- Authorization checks at multiple levels

---

## 📝 Implementation Notes

### Migration from PostGIS
- Removed complex spatial queries
- Simplified to zone selection dropdown
- Maintained location coordinates for mapping
- Eliminated boundary overlap calculations

### New Permission Model
- Category-zone based assignments
- Steward can manage multiple categories across zones
- Admin has full system access
- Citizens can view and create content

### Data Relationships
```
Users 1:M Issues (creator)
Issues M:1 Zones (user selected)
Issues M:1 Categories
Issues 1:M Comments
Issues 1:M Votes
Issues 1:M Media
Stewards M:M Categories (via steward_categories)
Steward_Categories M:1 Zones
```

This documentation reflects the complete API structure with the new zone selection and category-based steward management system.
