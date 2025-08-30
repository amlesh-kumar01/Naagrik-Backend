# Naagrik Backend API - Complete Admin Panel & Features Documentation

## Table of Contents
1. [Admin Zone Management](#admin-zone-management)
2. [Badge Management](#badge-management) 
3. [Dashboard & Analytics](#dashboard--analytics)
4. [Advanced Issue Management](#advanced-issue-management)
5. [User Management (Admin)](#user-management-admin)
6. [Steward Management](#steward-management)
7. [Bulk Operations](#bulk-operations)
8. [Filtering & Search](#filtering--search)

---

## Admin Zone Management

### Create Zone
```http
POST /api/zones
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Central District",
  "description": "Central business and administrative area"
}
```

### Get All Zones
```http
GET /api/zones
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "zones": [
      {
        "id": 1,
        "name": "Central District",
        "description": "Central business area",
        "steward_count": 5,
        "total_issues": 120,
        "active_issues": 45,
        "created_at": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

### Get Zone Details
```http
GET /api/zones/{zoneId}
Authorization: Bearer <admin_token>
```

### Update Zone
```http
PUT /api/zones/{zoneId}
Authorization: Bearer <admin_token>

{
  "name": "Updated Zone Name",
  "description": "Updated description"
}
```

### Delete Zone
```http
DELETE /api/zones/{zoneId}
Authorization: Bearer <admin_token>
```

### Get Zone Statistics
```http
GET /api/zones/{zoneId}/stats
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "steward_count": 5,
      "total_issues": 120,
      "open_issues": 45,
      "in_progress_issues": 30,
      "resolved_issues": 45,
      "avg_issue_score": 15.5,
      "issues_last_month": 25
    }
  }
}
```

### Get Zone Issues
```http
GET /api/zones/{zoneId}/issues?status=OPEN&priority=votes&limit=20&offset=0
Authorization: Bearer <admin_token>
```

### Get Zone Stewards
```http
GET /api/zones/{zoneId}/stewards
Authorization: Bearer <admin_token>
```

---

## Badge Management

### Create Badge
```http
POST /api/badges
Authorization: Bearer <admin_token>

{
  "name": "Problem Solver",
  "description": "Solved 10 community issues",
  "iconUrl": "https://example.com/icon.png",
  "requiredScore": 100
}
```

### Get All Badges (Public)
```http
GET /api/badges
```

### Get Badge Details (Public)
```http
GET /api/badges/{badgeId}
```

### Update Badge
```http
PUT /api/badges/{badgeId}
Authorization: Bearer <admin_token>

{
  "name": "Updated Badge Name",
  "description": "Updated description",
  "requiredScore": 150
}
```

### Delete Badge
```http
DELETE /api/badges/{badgeId}
Authorization: Bearer <admin_token>
```

### Award Badge to User
```http
POST /api/badges/award
Authorization: Bearer <admin_token>

{
  "userId": "user-uuid",
  "badgeId": 1
}
```

### Remove Badge from User
```http
POST /api/badges/remove
Authorization: Bearer <admin_token>

{
  "userId": "user-uuid",
  "badgeId": 1
}
```

### Get Badge Holders
```http
GET /api/badges/{badgeId}/holders?limit=50&offset=0
```

### Get Badge Statistics
```http
GET /api/badges/{badgeId}/stats
```

---

## Dashboard & Analytics

### System Statistics (Public)
```http
GET /api/dashboard/public/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_users": 1500,
      "total_citizens": 1350,
      "total_stewards": 140,
      "total_admins": 10,
      "total_issues": 5000,
      "open_issues": 120,
      "resolved_issues": 4500,
      "issues_today": 25,
      "avg_issue_score": 12.5,
      "pending_applications": 8
    }
  }
}
```

### Issue Trends
```http
GET /api/dashboard/trends?days=30
Authorization: Bearer <token>
```

### Top Issues
```http
GET /api/dashboard/top-issues?limit=10
Authorization: Bearer <token>
```

### Category Statistics
```http
GET /api/dashboard/categories
Authorization: Bearer <token>
```

### Issue Distribution (Geographic)
```http
GET /api/dashboard/distribution?limit=50
Authorization: Bearer <token>
```

### Admin Dashboard Overview
```http
GET /api/dashboard/admin/overview
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "systemStats": {...},
    "userActivityStats": {...},
    "categoryStats": [...],
    "topIssues": [...],
    "criticalIssues": [...],
    "stewardPerformance": [...]
  }
}
```

### Steward Dashboard
```http
GET /api/dashboard/steward/dashboard
Authorization: Bearer <steward_token>
```

### Steward Workload
```http
GET /api/dashboard/steward/workload
Authorization: Bearer <steward_token>
```

### Critical Issues (Steward)
```http
GET /api/dashboard/steward/critical-issues
Authorization: Bearer <steward_token>
```

### Admin - User Activity
```http
GET /api/dashboard/admin/user-activity
Authorization: Bearer <admin_token>
```

### Admin - Steward Performance
```http
GET /api/dashboard/admin/steward-performance?limit=20
Authorization: Bearer <admin_token>
```

### Admin - Resolution Time Stats
```http
GET /api/dashboard/admin/resolution-time
Authorization: Bearer <admin_token>
```

### Admin - Critical Issues
```http
GET /api/dashboard/admin/critical-issues
Authorization: Bearer <admin_token>
```

### Admin - Specific Steward Workload
```http
GET /api/dashboard/admin/steward/{stewardId}/workload
Authorization: Bearer <admin_token>
```

---

## Advanced Issue Management

### Advanced Issue Filtering
```http
GET /api/issues/filter/advanced?status=OPEN&category=1&priority=votes&lat=40.7128&lng=-74.0060&radius=5000&startDate=2025-01-01&endDate=2025-01-31&search=pothole&limit=50&offset=0
Authorization: Bearer <token> (optional)
```

**Parameters:**
- `status`: Array or single value (OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, ARCHIVED, DUPLICATE)
- `category`: Category ID
- `priority`: recent, votes, urgent, oldest
- `lat`, `lng`, `radius`: Location filtering (radius in meters)
- `startDate`, `endDate`: Date range
- `search`: Text search in title/description
- `limit`, `offset`: Pagination

### Trending Issues
```http
GET /api/issues/analytics/trending?limit=20
Authorization: Bearer <token> (optional)
```

### Issue Statistics
```http
GET /api/issues/analytics/statistics
Authorization: Bearer <token> (optional)
```

### Categories with Statistics
```http
GET /api/issues/analytics/categories
Authorization: Bearer <token> (optional)
```

### Issues by Location
```http
GET /api/issues/filter/location?lat=40.7128&lng=-74.0060&radius=5000&status=OPEN&limit=50
Authorization: Bearer <token> (optional)
```

### My Issues
```http
GET /api/issues/my/issues?status=OPEN&limit=50&offset=0
Authorization: Bearer <token>
```

### Issues Requiring Steward Attention
```http
GET /api/issues/steward/attention
Authorization: Bearer <steward_token>
```

### Bulk Update Issue Status
```http
PUT /api/issues/bulk/status
Authorization: Bearer <steward_token>

{
  "issueIds": ["uuid1", "uuid2", "uuid3"],
  "status": "RESOLVED",
  "reason": "All issues fixed during maintenance"
}
```

---

## User Management (Admin)

### Get All Users
```http
GET /api/users?role=CITIZEN&limit=50&offset=0&sortBy=created_at&sortOrder=DESC
Authorization: Bearer <admin_token>
```

### Get Filtered Users
```http
GET /api/users/admin/filtered?role=STEWARD&reputationMin=100&reputationMax=1000&hasIssues=true&search=john&limit=50&offset=0
Authorization: Bearer <admin_token>
```

**Parameters:**
- `role`: CITIZEN, STEWARD, SUPER_ADMIN
- `reputationMin`, `reputationMax`: Reputation range
- `registeredAfter`, `registeredBefore`: Registration date range
- `hasIssues`: Users who have reported issues
- `hasBadges`: Users who have earned badges
- `search`: Search in name/email

### Get User Statistics
```http
GET /api/users/admin/statistics
Authorization: Bearer <admin_token>
```

### Get User Activity Summary
```http
GET /api/users/{userId}/activity
Authorization: Bearer <admin_token>
```

### Get User History
```http
GET /api/users/{userId}/history?limit=50&offset=0
Authorization: Bearer <admin_token>
```

### Update User Reputation
```http
PUT /api/users/{userId}/reputation
Authorization: Bearer <admin_token>

{
  "change": 50,
  "reason": "Excellent community contribution"
}
```

### Update User Status (Suspend/Unsuspend)
```http
PUT /api/users/{userId}/status
Authorization: Bearer <admin_token>

{
  "suspended": true,
  "reason": "Policy violation"
}
```

### Bulk Update User Roles
```http
PUT /api/users/bulk/role
Authorization: Bearer <admin_token>

{
  "userIds": ["uuid1", "uuid2", "uuid3"],
  "role": "STEWARD"
}
```

---

## Steward Management

### Assign Steward to Zone
```http
POST /api/stewards/assignments
Authorization: Bearer <admin_token>

{
  "stewardId": "steward-uuid",
  "zoneId": 1
}
```

### Remove Steward from Zone
```http
DELETE /api/stewards/assignments
Authorization: Bearer <admin_token>

{
  "stewardId": "steward-uuid",
  "zoneId": 1
}
```

### Get All Stewards
```http
GET /api/stewards
Authorization: Bearer <admin_token>
```

### Get Pending Applications
```http
GET /api/stewards/applications/pending
Authorization: Bearer <admin_token>
```

### Review Application
```http
PUT /api/stewards/applications/{applicationId}/review
Authorization: Bearer <admin_token>

{
  "status": "APPROVED",
  "feedback": "Application meets all requirements"
}
```

### Get Steward Statistics
```http
GET /api/stewards/{stewardId}/stats
Authorization: Bearer <admin_token>
```

### Submit Steward Application
```http
POST /api/stewards/applications
Authorization: Bearer <token>

{
  "justification": "I want to help improve my community..."
}
```

### Get My Application
```http
GET /api/stewards/applications/me
Authorization: Bearer <token>
```

### Get My Steward Zones
```http
GET /api/stewards/zones/me
Authorization: Bearer <steward_token>
```

### Add Steward Note
```http
POST /api/stewards/issues/{issueId}/notes
Authorization: Bearer <steward_token>

{
  "note": "Inspected the location, repairs needed"
}
```

### Get Steward Notes
```http
GET /api/stewards/issues/{issueId}/notes
Authorization: Bearer <steward_token>
```

### Get My Steward Stats
```http
GET /api/stewards/stats/me
Authorization: Bearer <steward_token>
```

---

## Bulk Operations

### Bulk Issue Status Update
```http
PUT /api/issues/bulk/status
Authorization: Bearer <steward_token>

{
  "issueIds": ["uuid1", "uuid2"],
  "status": "RESOLVED",
  "reason": "Fixed during maintenance"
}
```

### Bulk User Role Update
```http
PUT /api/users/bulk/role
Authorization: Bearer <admin_token>

{
  "userIds": ["uuid1", "uuid2"],
  "role": "STEWARD"
}
```

---

## Filtering & Search

### Advanced Issue Filters

**By Status:**
```http
GET /api/issues/filter/advanced?status=OPEN,IN_PROGRESS
```

**By Priority/Sorting:**
```http
GET /api/issues/filter/advanced?priority=votes
# Options: recent, votes, urgent, oldest
```

**By Location:**
```http
GET /api/issues/filter/location?lat=40.7128&lng=-74.0060&radius=5000
```

**By Date Range:**
```http
GET /api/issues/filter/advanced?startDate=2025-01-01&endDate=2025-01-31
```

**By Category:**
```http
GET /api/issues/filter/advanced?category=1
```

**Text Search:**
```http
GET /api/issues/filter/advanced?search=pothole
```

**Combined Filters:**
```http
GET /api/issues/filter/advanced?status=OPEN&priority=votes&lat=40.7128&lng=-74.0060&radius=10000&search=street&limit=20
```

### User Filters

**By Role:**
```http
GET /api/users/admin/filtered?role=STEWARD
```

**By Reputation:**
```http
GET /api/users/admin/filtered?reputationMin=100&reputationMax=1000
```

**By Activity:**
```http
GET /api/users/admin/filtered?hasIssues=true&hasBadges=true
```

**By Registration Date:**
```http
GET /api/users/admin/filtered?registeredAfter=2025-01-01&registeredBefore=2025-01-31
```

---

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

## Authentication & Permissions

### Role-Based Access:

**CITIZEN:**
- View public content
- Create issues
- Comment and vote
- View own profile and activity

**STEWARD:**
- All CITIZEN permissions
- Update issue status in assigned zones
- Add steward notes
- View steward dashboard and workload
- Access steward-specific analytics

**SUPER_ADMIN:**
- All permissions
- User management
- Zone management
- Badge management
- Steward applications review
- Full admin dashboard and analytics
- Bulk operations

### Token Usage:
```http
Authorization: Bearer <jwt_token>
```

---

## Rate Limiting

- **General API:** 1000 requests per hour per IP
- **Authentication:** 5 login attempts per 15 minutes
- **Issue Creation:** 10 issues per hour per user
- **Voting:** 100 votes per hour per user
- **Comments:** 50 comments per hour per user

---

## Caching

The API implements Redis caching for:
- User profiles (10 minutes)
- Issue statistics (5 minutes)
- Badge information (15 minutes)
- Dashboard analytics (5-15 minutes depending on data)
- System statistics (10 minutes)

Cache keys are automatically invalidated when relevant data changes.
