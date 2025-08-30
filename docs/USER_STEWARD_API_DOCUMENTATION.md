# User Profile & Steward Management API Documentation

## Table of Contents
1. [Authentication](#authentication)
2. [User Profile Management](#user-profile-management)
3. [Steward Application System](#steward-application-system)
4. [Admin Panel - Steward Management](#admin-panel---steward-management)
5. [User Statistics & Badges](#user-statistics--badges)
6. [Frontend Integration Guide](#frontend-integration-guide)
7. [Error Codes & Responses](#error-codes--responses)

---

## Authentication

All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### User Roles
- `CITIZEN` - Regular user
- `STEWARD` - Approved steward with additional permissions
- `SUPER_ADMIN` - Full administrative access

---

## User Profile Management

### 1. Get User Profile
```http
GET /api/users/profile
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "CITIZEN",
      "reputationScore": 150,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  },
  "message": "Profile retrieved successfully"
}
```

### 2. Update User Profile
```http
PUT /api/users/profile
```
**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

**Body:**
```json
{
  "fullName": "John Updated Doe",
  "email": "newemail@example.com"
}
```

**Validation Rules:**
- `fullName`: 2-100 characters, letters and spaces only
- `email`: Valid email format

### 3. Upload Profile Image
```http
POST /api/upload/profile
```
**Headers:** `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`

**Body (form-data):**
- `image`: Image file (JPG, PNG, WebP - max 10MB)

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://cloudinary.com/image.jpg",
    "publicId": "profile_123_456",
    "width": 500,
    "height": 500
  }
}
```

### 4. Get User Statistics
```http
GET /api/users/stats
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "issuesCreated": 15,
    "commentsMade": 45,
    "votesCast": 23,
    "issuesResolved": 8,
    "badgesEarned": 3
  }
}
```

### 5. Get User Badges
```http
GET /api/users/badges
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "badges": [
      {
        "id": 1,
        "name": "First Reporter",
        "description": "Created your first issue",
        "iconUrl": "https://example.com/badge1.png",
        "earnedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### 6. Get Leaderboard
```http
GET /api/users/leaderboard?limit=50
```

**Query Parameters:**
- `limit` (optional): Number of users to return (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "id": "uuid",
        "fullName": "Top User",
        "reputationScore": 2500,
        "rank": 1
      }
    ]
  }
}
```

---

## Steward Application System

### 1. Submit Steward Application
```http
POST /api/stewards/applications
```
**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

**Body:**
```json
{
  "justification": "I have been actively reporting issues in my neighborhood for 6 months and want to help moderate and resolve community problems more effectively."
}
```

**Validation Rules:**
- `justification`: 50-1000 characters, required

**Response:**
```json
{
  "success": true,
  "data": {
    "application": {
      "id": "uuid",
      "userId": "uuid",
      "justification": "...",
      "status": "PENDING",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  },
  "message": "Steward application submitted successfully"
}
```

### 2. Get My Application Status
```http
GET /api/stewards/applications/me
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "application": {
      "id": "uuid",
      "status": "PENDING",
      "justification": "...",
      "createdAt": "2024-01-01T00:00:00Z",
      "reviewedAt": null,
      "feedback": null
    }
  }
}
```

### 3. Get My Steward Zones (Steward Only)
```http
GET /api/stewards/zones/me
```
**Headers:** `Authorization: Bearer <token>`
**Required Role:** `STEWARD`

**Response:**
```json
{
  "success": true,
  "data": {
    "zones": [
      {
        "id": 1,
        "name": "Downtown District",
        "description": "Central business area"
      }
    ]
  }
}
```

### 4. Add Steward Note to Issue (Steward Only)
```http
POST /api/stewards/issues/:issueId/notes
```
**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
**Required Role:** `STEWARD`

**Body:**
```json
{
  "note": "Inspected the location. Municipal team has been notified and repair scheduled for next week."
}
```

**Validation Rules:**
- `note`: 1-1000 characters, required

### 5. Get Steward Notes for Issue
```http
GET /api/stewards/issues/:issueId/notes
```
**Headers:** `Authorization: Bearer <token>`
**Required Role:** `STEWARD`

**Response:**
```json
{
  "success": true,
  "data": {
    "notes": [
      {
        "id": "uuid",
        "note": "...",
        "stewardName": "John Steward",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 6. Get My Steward Statistics
```http
GET /api/stewards/stats/me
```
**Headers:** `Authorization: Bearer <token>`
**Required Role:** `STEWARD`

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "issuesReviewed": 45,
      "notesAdded": 32,
      "issuesResolved": 23,
      "averageResolutionTime": "5.2 days"
    }
  }
}
```

---

## Admin Panel - Steward Management

### 1. Get Pending Applications (Admin Only)
```http
GET /api/stewards/applications/pending
```
**Headers:** `Authorization: Bearer <token>`
**Required Role:** `SUPER_ADMIN`

**Response:**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "uuid",
        "user": {
          "id": "uuid",
          "fullName": "John Doe",
          "email": "john@example.com",
          "reputationScore": 150
        },
        "justification": "...",
        "status": "PENDING",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 2. Review Steward Application (Admin Only)
```http
PUT /api/stewards/applications/:id/review
```
**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
**Required Role:** `SUPER_ADMIN`

**Body:**
```json
{
  "status": "APPROVED",
  "feedback": "Your application shows good community engagement. Welcome to the steward team!"
}
```

**Validation Rules:**
- `status`: Must be "APPROVED" or "REJECTED"
- `feedback`: Optional, max 500 characters

**Response:**
```json
{
  "success": true,
  "data": {
    "application": {
      "id": "uuid",
      "status": "APPROVED",
      "feedback": "...",
      "reviewedAt": "2024-01-01T12:00:00Z",
      "reviewedBy": "admin-uuid"
    }
  },
  "message": "Application approved successfully"
}
```

### 3. Get All Stewards (Admin Only)
```http
GET /api/stewards/
```
**Headers:** `Authorization: Bearer <token>`
**Required Role:** `SUPER_ADMIN`

**Response:**
```json
{
  "success": true,
  "data": {
    "stewards": [
      {
        "id": "uuid",
        "fullName": "Jane Steward",
        "email": "jane@example.com",
        "reputationScore": 450,
        "assignedZones": [
          {
            "id": 1,
            "name": "Downtown District"
          }
        ],
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 4. Assign Steward to Zone (Admin Only)
```http
POST /api/stewards/assignments
```
**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
**Required Role:** `SUPER_ADMIN`

**Body:**
```json
{
  "stewardId": "steward-uuid",
  "zoneId": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assignment": {
      "stewardId": "steward-uuid",
      "zoneId": 1,
      "assignedAt": "2024-01-01T12:00:00Z"
    }
  },
  "message": "Steward assigned to zone successfully"
}
```

### 5. Remove Steward from Zone (Admin Only)
```http
DELETE /api/stewards/assignments
```
**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
**Required Role:** `SUPER_ADMIN`

**Body:**
```json
{
  "stewardId": "steward-uuid",
  "zoneId": 1
}
```

### 6. Get Steward Performance Stats (Admin Only)
```http
GET /api/stewards/:stewardId/stats
```
**Headers:** `Authorization: Bearer <token>`
**Required Role:** `SUPER_ADMIN`

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "stewardId": "uuid",
      "fullName": "Jane Steward",
      "issuesReviewed": 120,
      "notesAdded": 95,
      "issuesResolved": 67,
      "averageResolutionTime": "4.8 days",
      "performanceScore": 8.5
    }
  }
}
```

### 7. Search Users (Admin Only)
```http
GET /api/users/search?q=john&limit=20
```
**Headers:** `Authorization: Bearer <token>`
**Required Role:** `SUPER_ADMIN`

**Query Parameters:**
- `q`: Search term (name or email)
- `limit`: Number of results (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "fullName": "John Doe",
        "email": "john@example.com",
        "role": "CITIZEN",
        "reputationScore": 150
      }
    ]
  }
}
```

---

## Frontend Integration Guide

### 1. User Profile Page Components

#### Profile Header Component
```jsx
// ProfileHeader.jsx
const ProfileHeader = ({ user, onImageUpload }) => {
  return (
    <div className="profile-header">
      <div className="avatar-container">
        <img src={user.profileImage || '/default-avatar.png'} />
        <button onClick={onImageUpload}>Change Photo</button>
      </div>
      <div className="user-info">
        <h1>{user.fullName}</h1>
        <p>{user.email}</p>
        <div className="reputation">
          <span>Reputation: {user.reputationScore}</span>
        </div>
      </div>
    </div>
  );
};
```

#### Profile Statistics Component
```jsx
// ProfileStats.jsx
const ProfileStats = ({ stats }) => {
  return (
    <div className="stats-grid">
      <StatCard title="Issues Created" value={stats.issuesCreated} />
      <StatCard title="Comments Made" value={stats.commentsMade} />
      <StatCard title="Votes Cast" value={stats.votesCast} />
      <StatCard title="Issues Resolved" value={stats.issuesResolved} />
      <StatCard title="Badges Earned" value={stats.badgesEarned} />
    </div>
  );
};
```

### 2. Steward Application Components

#### Application Form Component
```jsx
// StewardApplicationForm.jsx
const StewardApplicationForm = ({ onSubmit }) => {
  const [justification, setJustification] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (justification.length < 50) {
      alert('Justification must be at least 50 characters');
      return;
    }
    onSubmit({ justification });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Apply to Become a Steward</h2>
      <textarea
        value={justification}
        onChange={(e) => setJustification(e.target.value)}
        placeholder="Explain why you want to become a steward (minimum 50 characters)"
        minLength={50}
        maxLength={1000}
        required
      />
      <p>{justification.length}/1000 characters</p>
      <button type="submit">Submit Application</button>
    </form>
  );
};
```

### 3. Admin Panel Components

#### Pending Applications Component
```jsx
// PendingApplications.jsx
const PendingApplications = ({ applications, onReview }) => {
  return (
    <div className="pending-applications">
      <h2>Pending Steward Applications</h2>
      {applications.map(app => (
        <ApplicationCard 
          key={app.id}
          application={app}
          onApprove={() => onReview(app.id, 'APPROVED')}
          onReject={() => onReview(app.id, 'REJECTED')}
        />
      ))}
    </div>
  );
};

const ApplicationCard = ({ application, onApprove, onReject }) => {
  return (
    <div className="application-card">
      <div className="applicant-info">
        <h3>{application.user.fullName}</h3>
        <p>{application.user.email}</p>
        <p>Reputation: {application.user.reputationScore}</p>
      </div>
      <div className="justification">
        <p>{application.justification}</p>
      </div>
      <div className="actions">
        <button onClick={onApprove} className="approve-btn">
          Approve
        </button>
        <button onClick={onReject} className="reject-btn">
          Reject
        </button>
      </div>
    </div>
  );
};
```

#### Steward Management Component
```jsx
// StewardManagement.jsx
const StewardManagement = ({ stewards, zones, onAssign, onRemove }) => {
  return (
    <div className="steward-management">
      <h2>Steward Management</h2>
      <div className="stewards-list">
        {stewards.map(steward => (
          <StewardCard
            key={steward.id}
            steward={steward}
            zones={zones}
            onAssign={onAssign}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
};
```

### 4. Required Frontend Pages

#### 1. User Profile Page (`/profile`)
- **Components**: ProfileHeader, ProfileStats, BadgesList, EditProfileForm
- **API Calls**: GET /api/users/profile, GET /api/users/stats, GET /api/users/badges
- **Features**: View/edit profile, upload avatar, view statistics and badges

#### 2. Steward Application Page (`/steward/apply`)
- **Components**: StewardApplicationForm, ApplicationStatus
- **API Calls**: POST /api/stewards/applications, GET /api/stewards/applications/me
- **Features**: Submit application, view application status

#### 3. Steward Dashboard (`/steward/dashboard`)
- **Components**: StewardStats, AssignedZones, RecentNotes
- **API Calls**: GET /api/stewards/zones/me, GET /api/stewards/stats/me
- **Features**: View assigned zones, performance stats, add notes to issues

#### 4. Admin Panel - Applications (`/admin/applications`)
- **Components**: PendingApplications, ApplicationReview
- **API Calls**: GET /api/stewards/applications/pending, PUT /api/stewards/applications/:id/review
- **Features**: Review and approve/reject applications

#### 5. Admin Panel - Steward Management (`/admin/stewards`)
- **Components**: StewardList, ZoneAssignment, PerformanceStats
- **API Calls**: GET /api/stewards/, POST/DELETE /api/stewards/assignments
- **Features**: Manage steward zone assignments, view performance

#### 6. Admin Panel - User Management (`/admin/users`)
- **Components**: UserSearch, UserList, UserDetails
- **API Calls**: GET /api/users/search, GET /api/users/leaderboard
- **Features**: Search users, view user details, manage roles

### 5. State Management Example (Redux)

```jsx
// userSlice.js
const userSlice = createSlice({
  name: 'user',
  initialState: {
    profile: null,
    stats: null,
    badges: [],
    loading: false,
    error: null
  },
  reducers: {
    // reducers
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  }
});

// stewardSlice.js
const stewardSlice = createSlice({
  name: 'steward',
  initialState: {
    application: null,
    zones: [],
    stats: null,
    pendingApplications: [],
    allStewards: []
  }
});
```

---

## Error Codes & Responses

### Common Error Responses

#### 400 - Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "justification",
      "message": "Justification must be between 50 and 1000 characters",
      "value": "short"
    }
  ]
}
```

#### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Access denied. Please login."
}
```

#### 403 - Forbidden
```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions."
}
```

#### 404 - Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

#### 409 - Conflict
```json
{
  "success": false,
  "message": "You already have a steward application"
}
```

#### 429 - Rate Limit Exceeded
```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

### Rate Limits
- Profile updates: 10 requests per hour
- Image uploads: 5 requests per hour
- Application submission: 1 request per day
- Admin actions: 100 requests per hour

---

## Environment Setup

### Required Environment Variables
```env
# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Redis (for caching and rate limiting)
REDIS_URL=redis://localhost:6379
```

### Frontend Environment Variables
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

---

This documentation provides everything needed to integrate user profiles and steward management into your frontend application. Each API endpoint includes validation rules, required permissions, and example responses to ensure smooth integration.
