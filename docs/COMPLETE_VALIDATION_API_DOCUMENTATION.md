# Complete API Documentation with Validation Checks

## Comments API Documentation

### 1. Get Comments for an Issue
```http
GET /api/comments/issues/:issueId/comments
```

**Authentication**: Optional (Public with enhanced features for authenticated users)

**Parameters**:
- `issueId` (URL param): Valid UUID of the issue

**Query Parameters**:
- `page` (optional): Page number (min: 1, default: 1)
- `limit` (optional): Items per page (min: 1, max: 100, default: 20)

**Response**:
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "uuid",
        "content": "string",
        "user_id": "uuid",
        "issue_id": "uuid",
        "created_at": "timestamp",
        "updated_at": "timestamp",
        "user": {
          "id": "uuid",
          "full_name": "string",
          "reputation": number
        }
      }
    ]
  },
  "message": "Comments retrieved successfully"
}
```

### 2. Create Comment
```http
POST /api/comments/issues/:issueId/comments
```

**Authentication**: Required (JWT Token)

**Rate Limiting**: Applied (comment rate limit)

**Validation Rules**:
- `issueId` (URL param): Must be valid UUID
- `content` (body): Required, trimmed, 1-1000 characters

**Request Body**:
```json
{
  "content": "string (1-1000 chars, trimmed)"
}
```

**Validation Errors**:
- `400`: "Valid issue ID is required" (invalid UUID)
- `400`: "Comment must be between 1 and 1000 characters"
- `404`: "Issue not found"
- `429`: "Rate limit exceeded"

**Response**:
```json
{
  "success": true,
  "data": {
    "comment": {
      "id": "uuid",
      "content": "string",
      "user_id": "uuid",
      "issue_id": "uuid",
      "created_at": "timestamp"
    }
  },
  "message": "Comment created successfully"
}
```

### 3. Get Single Comment
```http
GET /api/comments/:commentId
```

**Authentication**: Optional

**Validation Rules**:
- `commentId` (URL param): Must be valid UUID

**Validation Errors**:
- `400`: "Invalid comment ID" (invalid UUID)
- `404`: "Comment not found"

### 4. Update Comment
```http
PUT /api/comments/:commentId
```

**Authentication**: Required (JWT Token)

**Authorization**: Only comment owner can update

**Validation Rules**:
- `commentId` (URL param): Must be valid UUID
- `content` (body): Required, trimmed, 1-1000 characters

**Request Body**:
```json
{
  "content": "string (1-1000 chars, trimmed)"
}
```

**Validation Errors**:
- `400`: "Invalid comment ID"
- `400`: "Comment must be between 1 and 1000 characters"
- `403`: "You do not have permission to update this comment"
- `404`: "Comment not found"

### 5. Delete Comment
```http
DELETE /api/comments/:commentId
```

**Authentication**: Required (JWT Token)

**Authorization**: Comment owner, Steward, or Admin

**Validation Rules**:
- `commentId` (URL param): Must be valid UUID

**Authorization Logic**:
- Comment owner: Can delete own comment
- Steward/Admin: Can delete any comment

**Validation Errors**:
- `400`: "Invalid comment ID"
- `403`: "You can only delete your own comments"
- `404`: "Comment not found"

### 6. Flag Comment
```http
POST /api/comments/:commentId/flag
```

**Authentication**: Required (JWT Token)

**Validation Rules**:
- `commentId` (URL param): Must be valid UUID

**Validation Errors**:
- `400`: "Invalid comment ID"
- `404`: "Comment not found"
- `409`: "Comment already flagged by this user"

### 7. Get User Comments
```http
GET /api/comments/users/:userId/comments
```

**Authentication**: Optional

**Query Parameters**:
- `page` (optional): Page number (min: 1, default: 1)
- `limit` (optional): Items per page (min: 1, max: 100, default: 20)

**Validation Rules**:
- `userId` (URL param): Must be valid UUID

---

## Voting API Documentation

### Vote on Issue
```http
POST /api/issues/:issueId/vote
```

**Authentication**: Required (JWT Token)

**Rate Limiting**: 100 requests per hour per user

**Validation Rules**:
- `issueId` (URL param): Must be valid UUID
- `voteType` (body): Must be exactly 1 (upvote) or -1 (downvote)

**Request Body**:
```json
{
  "voteType": 1  // 1 for upvote, -1 for downvote
}
```

**Business Logic Validation**:
- Users cannot vote on their own issues
- Each user can only vote once per issue
- Changing vote updates the previous vote

**Validation Errors**:
- `400`: "Valid issue ID is required" (invalid UUID)
- `400`: "Vote type must be 1 (upvote) or -1 (downvote)"
- `400`: "You cannot vote on your own issue"
- `404`: "Issue not found"
- `429`: "Rate limit exceeded (100 votes per hour)"

**Response**:
```json
{
  "success": true,
  "data": {
    "issue": {
      "id": "uuid",
      "upvotes": number,
      "downvotes": number,
      "vote_score": number
    },
    "userVote": {
      "vote_type": 1 | -1,
      "created_at": "timestamp"
    },
    "reputationChange": number
  },
  "message": "Vote recorded successfully"
}
```

---

## Statistics & Dashboard API Documentation

### 1. Public System Statistics
```http
GET /api/dashboard/public/stats
```

**Authentication**: None required

**Response**:
```json
{
  "success": true,
  "data": {
    "totalIssues": number,
    "resolvedIssues": number,
    "activeUsers": number,
    "totalStewards": number,
    "resolutionRate": number,
    "averageResolutionTime": number
  },
  "message": "System statistics retrieved successfully"
}
```

### 2. Issue Trends
```http
GET /api/dashboard/trends
```

**Authentication**: Required (JWT Token)

**Query Parameters**:
- `timeframe` (optional): "7d", "30d", "90d" (default: "30d")

**Response**:
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "date": "YYYY-MM-DD",
        "issues_created": number,
        "issues_resolved": number
      }
    ]
  },
  "message": "Trends retrieved successfully"
}
```

### 3. Top Issues by Votes
```http
GET /api/dashboard/top-issues
```

**Authentication**: Required (JWT Token)

**Query Parameters**:
- `limit` (optional): Number of issues (min: 1, max: 50, default: 10)
- `timeframe` (optional): "7d", "30d", "all" (default: "30d")

**Response**:
```json
{
  "success": true,
  "data": {
    "topIssues": [
      {
        "id": "uuid",
        "title": "string",
        "vote_score": number,
        "upvotes": number,
        "downvotes": number,
        "status": "string",
        "category": "string"
      }
    ]
  },
  "message": "Top issues retrieved successfully"
}
```

### 4. Category Statistics
```http
GET /api/dashboard/categories
```

**Authentication**: Required (JWT Token)

**Response**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": number,
        "name": "string",
        "total_issues": number,
        "resolved_issues": number,
        "resolution_rate": number,
        "avg_resolution_time": number
      }
    ]
  },
  "message": "Category statistics retrieved successfully"
}
```

### 5. Issue Distribution
```http
GET /api/dashboard/distribution
```

**Authentication**: Required (JWT Token)

**Response**:
```json
{
  "success": true,
  "data": {
    "statusDistribution": {
      "OPEN": number,
      "ACKNOWLEDGED": number,
      "IN_PROGRESS": number,
      "RESOLVED": number,
      "ARCHIVED": number
    },
    "categoryDistribution": [
      {
        "category": "string",
        "count": number,
        "percentage": number
      }
    ]
  },
  "message": "Distribution statistics retrieved successfully"
}
```

### 6. Advanced Issue Statistics
```http
GET /api/issues/analytics/statistics
```

**Authentication**: Optional

**Query Parameters**:
- `timeframe` (optional): "7d", "30d", "90d", "all" (default: "30d")
- `categoryId` (optional): Filter by category (integer)
- `status` (optional): Filter by status

**Response**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalIssues": number,
      "resolvedIssues": number,
      "resolutionRate": number,
      "averageVoteScore": number
    },
    "categoryBreakdown": [
      {
        "category": "string",
        "count": number,
        "resolved": number,
        "avgVotes": number
      }
    ],
    "statusBreakdown": {
      "OPEN": number,
      "RESOLVED": number,
      "IN_PROGRESS": number
    }
  },
  "message": "Issue statistics retrieved successfully"
}
```

### 7. Trending Issues
```http
GET /api/issues/analytics/trending
```

**Authentication**: Optional

**Query Parameters**:
- `limit` (optional): Number of issues (min: 1, max: 50, default: 10)
- `timeframe` (optional): "24h", "7d", "30d" (default: "7d")

**Response**:
```json
{
  "success": true,
  "data": {
    "trendingIssues": [
      {
        "id": "uuid",
        "title": "string",
        "vote_score": number,
        "comment_count": number,
        "trending_score": number,
        "category": "string",
        "status": "string"
      }
    ]
  },
  "message": "Trending issues retrieved successfully"
}
```

---

## Admin Dashboard Statistics

### 1. Admin Overview Dashboard
```http
GET /api/dashboard/admin/overview
```

**Authentication**: Required (JWT Token)
**Authorization**: Admin only

**Response**:
```json
{
  "success": true,
  "data": {
    "systemStats": {
      "totalUsers": number,
      "totalIssues": number,
      "totalStewards": number,
      "resolutionRate": number
    },
    "recentActivity": {
      "newIssues": number,
      "resolvedIssues": number,
      "newUsers": number
    },
    "trends": {
      "issuesTrend": "increasing|decreasing|stable",
      "resolutionTrend": "improving|declining|stable"
    }
  },
  "message": "Admin dashboard retrieved successfully"
}
```

### 2. User Activity Statistics
```http
GET /api/dashboard/admin/user-activity
```

**Authentication**: Required (JWT Token)
**Authorization**: Admin only

**Query Parameters**:
- `timeframe` (optional): "7d", "30d", "90d" (default: "30d")

**Response**:
```json
{
  "success": true,
  "data": {
    "userActivity": {
      "activeUsers": number,
      "newRegistrations": number,
      "avgSessionTime": number,
      "topContributors": [
        {
          "user_id": "uuid",
          "full_name": "string",
          "issues_created": number,
          "comments_made": number,
          "reputation": number
        }
      ]
    }
  },
  "message": "User activity statistics retrieved successfully"
}
```

### 3. Steward Performance
```http
GET /api/dashboard/admin/steward-performance
```

**Authentication**: Required (JWT Token)
**Authorization**: Admin only

**Response**:
```json
{
  "success": true,
  "data": {
    "stewardPerformance": [
      {
        "steward_id": "uuid",
        "full_name": "string",
        "assigned_zone": "string",
        "issues_handled": number,
        "issues_resolved": number,
        "avg_resolution_time": number,
        "performance_score": number,
        "last_active": "timestamp"
      }
    ]
  },
  "message": "Steward performance retrieved successfully"
}
```

### 4. Resolution Time Statistics
```http
GET /api/dashboard/admin/resolution-time
```

**Authentication**: Required (JWT Token)
**Authorization**: Admin only

**Query Parameters**:
- `categoryId` (optional): Filter by category (integer)
- `stewardId` (optional): Filter by steward (UUID)

**Response**:
```json
{
  "success": true,
  "data": {
    "resolutionStats": {
      "averageResolutionTime": number,
      "medianResolutionTime": number,
      "fastestResolution": number,
      "slowestResolution": number
    },
    "categoryBreakdown": [
      {
        "category": "string",
        "avg_resolution_time": number,
        "total_resolved": number
      }
    ]
  },
  "message": "Resolution time statistics retrieved successfully"
}
```

---

## Advanced Filtering with Validation

### 1. Advanced Issue Filtering
```http
GET /api/issues/filter/advanced
```

**Authentication**: Optional

**Validation Rules**:
- `priority` (query): Must be one of "recent", "votes", "urgent", "oldest"
- `limit` (query): Integer between 1-100 (default: 20)
- `offset` (query): Non-negative integer (default: 0)
- `status` (query): Must be valid status enum
- `categoryId` (query): Positive integer
- `search` (query): 1-100 characters, trimmed

**Query Parameters**:
```
priority=recent|votes|urgent|oldest
limit=1-100
offset=0+
status=OPEN|ACKNOWLEDGED|IN_PROGRESS|RESOLVED|ARCHIVED|DUPLICATE
categoryId=positive_integer
search=string(1-100_chars)
userId=valid_uuid
```

**Validation Errors**:
- `400`: "Invalid priority filter"
- `400`: "Limit must be between 1 and 100"
- `400`: "Offset must be non-negative"
- `400`: "Invalid status filter"
- `400`: "Category ID must be a positive integer"
- `400`: "Search term must be between 1 and 100 characters"
- `400`: "Valid user ID is required"

### 2. Location-Based Filtering
```http
GET /api/issues/filter/location
```

**Authentication**: Optional

**Validation Rules**:
- `lat` (query): Float between -90 and 90 (required)
- `lng` (query): Float between -180 and 180 (required)
- `radius` (query): Integer between 100-50000 meters (optional, default: 5000)

**Query Parameters**:
```
lat=-90.0_to_90.0
lng=-180.0_to_180.0
radius=100-50000
```

**Validation Errors**:
- `400`: "Latitude must be between -90 and 90"
- `400`: "Longitude must be between -180 and 180"
- `400`: "Radius must be between 100 and 50000 meters"

---

## Comprehensive Error Response Format

All APIs follow this error response format:

```json
{
  "success": false,
  "data": null,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific validation error"
    }
  ]
}
```

### Common HTTP Status Codes:

- **200**: Success
- **201**: Created successfully
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (resource doesn't exist)
- **409**: Conflict (duplicate action)
- **429**: Too Many Requests (rate limit exceeded)
- **500**: Internal Server Error

---

## Rate Limiting Details

### Comment Rate Limiting
- **Endpoint**: `POST /api/comments/issues/:issueId/comments`
- **Limit**: Configured via `rateLimitService.commentRateLimit()`
- **Error Response**: `429 Too Many Requests`

### Vote Rate Limiting
- **Endpoint**: `POST /api/issues/:issueId/vote`
- **Limit**: 100 requests per hour per user
- **Key**: Based on user ID or IP address
- **Error Response**: `429 Too Many Requests`

### Issue Creation Rate Limiting
- **Endpoint**: `POST /api/issues`
- **Limit**: Configured via `rateLimitService.issueRateLimit()`
- **Error Response**: `429 Too Many Requests`

---

## Authorization Matrix

| Endpoint | Public | Citizen | Steward | Admin |
|----------|--------|---------|---------|-------|
| Get Comments | ✅ | ✅ | ✅ | ✅ |
| Create Comment | ❌ | ✅ | ✅ | ✅ |
| Update Comment | ❌ | ✅ (own) | ✅ (own) | ✅ (own) |
| Delete Comment | ❌ | ✅ (own) | ✅ (any) | ✅ (any) |
| Flag Comment | ❌ | ✅ | ✅ | ✅ |
| Vote on Issue | ❌ | ✅ | ✅ | ✅ |
| Public Stats | ✅ | ✅ | ✅ | ✅ |
| Dashboard Stats | ❌ | ✅ | ✅ | ✅ |
| Admin Stats | ❌ | ❌ | ❌ | ✅ |

---

## Input Sanitization & Security

### Text Content Processing:
- All text inputs are **trimmed** (leading/trailing whitespace removed)
- HTML encoding applied to prevent XSS
- SQL injection protection via parameterized queries

### File Upload Validation:
- File type validation for images/videos
- File size limits enforced
- Virus scanning applied
- Cloudinary integration for secure storage

### Rate Limiting Strategy:
- Different limits for different operations
- User-based and IP-based limiting
- Redis-backed for distributed systems
- Graceful degradation on rate limit exceeded

This documentation provides complete validation details for frontend integration. All endpoints include proper error handling, input validation, and security measures.
