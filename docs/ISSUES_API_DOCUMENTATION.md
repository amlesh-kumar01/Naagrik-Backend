# Issues API Documentation

## Overview
The Issues API provides comprehensive functionality for creating, managing, and interacting with civic issues in the Naagrik platform. Users can report problems, upload media, vote on issues, and track their resolution status.

## Base URL
```
/api/issues
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Create Issue
Create a new civic issue with optional media attachments.

**Endpoint:** `POST /api/issues`

**Request Body:**
```json
{
  "title": "Pothole on Main Street",
  "description": "Large pothole causing traffic issues and potential vehicle damage",
  "categoryId": 1,
  "locationLat": 40.7128,
  "locationLng": -74.0060,
  "address": "123 Main Street, New York, NY",
  "mediaUrls": [
    {
      "url": "https://res.cloudinary.com/naagrik/image/upload/v1234567890/issue_123.jpg",
      "publicId": "issue_123",
      "type": "image",
      "width": 1920,
      "height": 1080
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Issue created successfully",
  "data": {
    "issue": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Pothole on Main Street",
      "description": "Large pothole causing traffic issues...",
      "status": "OPEN",
      "user_id": "user-uuid",
      "category_id": 1,
      "location_lat": 40.7128,
      "location_lng": -74.0060,
      "address": "123 Main Street, New York, NY",
      "vote_score": 0,
      "ai_flag": false,
      "created_at": "2025-08-30T10:00:00Z",
      "updated_at": "2025-08-30T10:00:00Z"
    }
  }
}
```

---

### 2. Get All Issues
Retrieve issues with filtering and pagination.

**Endpoint:** `GET /api/issues`

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 10, max: 100) - Items per page
- `status` (string) - Filter by status: `OPEN`, `ACKNOWLEDGED`, `IN_PROGRESS`, `RESOLVED`, `ARCHIVED`, `DUPLICATE`
- `categoryId` (integer) - Filter by category ID
- `userId` (string) - Filter by user ID
- `search` (string) - Search in title and description
- `nearLat` (float) - Latitude for location-based search
- `nearLng` (float) - Longitude for location-based search
- `radius` (float, default: 50) - Search radius in kilometers

**Example Request:**
```
GET /api/issues?page=1&limit=20&status=OPEN&nearLat=40.7128&nearLng=-74.0060&radius=10
```

**Response:**
```json
{
  "success": true,
  "message": "Issues retrieved successfully",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Pothole on Main Street",
      "description": "Large pothole causing...",
      "status": "OPEN",
      "user_name": "John Doe",
      "user_reputation": 150,
      "category_name": "Road Maintenance",
      "comment_count": 5,
      "upvote_count": 12,
      "downvote_count": 2,
      "media_count": 1,
      "thumbnail_url": "https://res.cloudinary.com/naagrik/image/upload/v1234567890/issue_123.jpg",
      "first_media_url": "https://res.cloudinary.com/naagrik/image/upload/v1234567890/issue_123.jpg",
      "first_media_type": "IMAGE",
      "distance": 2.5,
      "created_at": "2025-08-30T10:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### 3. Get Issue by ID
Retrieve detailed information about a specific issue.

**Endpoint:** `GET /api/issues/:id`

**Response:**
```json
{
  "success": true,
  "message": "Issue retrieved successfully",
  "data": {
    "issue": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Pothole on Main Street",
      "description": "Large pothole causing traffic issues...",
      "status": "OPEN",
      "user_id": "user-uuid",
      "user_name": "John Doe",
      "user_reputation": 150,
      "category_id": 1,
      "category_name": "Road Maintenance",
      "location_lat": 40.7128,
      "location_lng": -74.0060,
      "address": "123 Main Street, New York, NY",
      "vote_score": 10,
      "ai_flag": false,
      "primary_issue_id": null,
      "primary_issue_title": null,
      "thumbnail_url": "https://res.cloudinary.com/naagrik/image/upload/v1234567890/issue_123.jpg",
      "created_at": "2025-08-30T10:00:00Z",
      "updated_at": "2025-08-30T10:00:00Z",
      "resolved_at": null,
      "media": [
        {
          "id": "media-uuid",
          "media_url": "https://res.cloudinary.com/naagrik/image/upload/v1234567890/issue_123.jpg",
          "media_type": "IMAGE",
          "is_thumbnail": true,
          "moderation_status": "APPROVED",
          "ai_tags": ["pothole", "road"],
          "created_at": "2025-08-30T10:00:00Z"
        }
      ],
      "comments": [
        {
          "id": "comment-uuid",
          "content": "This pothole has been there for weeks!",
          "user_id": "commenter-uuid",
          "user_name": "Jane Smith",
          "user_reputation": 75,
          "created_at": "2025-08-30T11:00:00Z"
        }
      ],
      "steward_notes": [
        {
          "id": "note-uuid",
          "note": "Issue has been forwarded to road maintenance department",
          "steward_id": "steward-uuid",
          "steward_name": "City Official",
          "priority": "MEDIUM",
          "created_at": "2025-08-30T12:00:00Z"
        }
      ]
    }
  }
}
```

---

### 4. Update Issue Status
Update the status of an issue (requires STEWARD or SUPER_ADMIN role).

**Endpoint:** `PUT /api/issues/:id/status`

**Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "reason": "Work crew has been assigned to fix this issue"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Issue status updated successfully",
  "data": {
    "issue": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "IN_PROGRESS",
      "updated_at": "2025-08-30T14:00:00Z"
    }
  }
}
```

---

### 5. Vote on Issue
Cast an upvote or downvote on an issue.

**Endpoint:** `POST /api/issues/:issueId/vote`

**Request Body:**
```json
{
  "voteType": 1  // 1 for upvote, -1 for downvote
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vote recorded successfully",
  "data": {
    "voteScore": 11,
    "reputationChange": 2
  }
}
```

---

### 6. Mark as Duplicate
Mark an issue as duplicate of another issue.

**Endpoint:** `POST /api/issues/:id/duplicate`

**Request Body:**
```json
{
  "primaryIssueId": "primary-issue-uuid",
  "reason": "This is a duplicate of issue #123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Issue marked as duplicate successfully",
  "data": {
    "issue": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "DUPLICATE",
      "primary_issue_id": "primary-issue-uuid"
    }
  }
}
```

---

### 7. Get Issue Categories
Retrieve all available issue categories.

**Endpoint:** `GET /api/issues/categories`

**Response:**
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "Road Maintenance",
        "description": "Issues related to road conditions, potholes, etc."
      },
      {
        "id": 2,
        "name": "Public Safety",
        "description": "Safety concerns in public areas"
      }
    ]
  }
}
```

---

### 8. Get Issue History
Get the status change history of an issue.

**Endpoint:** `GET /api/issues/:id/history`

**Response:**
```json
{
  "success": true,
  "message": "Issue history retrieved successfully",
  "data": {
    "history": [
      {
        "id": "history-uuid",
        "issue_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "steward-uuid",
        "user_name": "City Official",
        "old_status": "OPEN",
        "new_status": "IN_PROGRESS",
        "change_reason": "Work crew assigned",
        "created_at": "2025-08-30T14:00:00Z"
      }
    ]
  }
}
```

---

### 9. Delete Issue
Soft delete an issue (sets status to ARCHIVED).

**Endpoint:** `DELETE /api/issues/:id`

**Response:**
```json
{
  "success": true,
  "message": "Issue deleted successfully",
  "data": {
    "issue": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "ARCHIVED"
    }
  }
}
```

---

### 10. Add Media to Issue
Add media files to an existing issue.

**Endpoint:** `POST /api/issues/:issueId/media`

**Request Body:**
```json
{
  "mediaUrl": "https://res.cloudinary.com/naagrik/image/upload/v1234567890/additional_image.jpg",
  "mediaType": "IMAGE",
  "isThumbnail": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Media added to issue successfully",
  "data": {
    "media": {
      "id": "media-uuid",
      "issue_id": "550e8400-e29b-41d4-a716-446655440000",
      "media_url": "https://res.cloudinary.com/naagrik/image/upload/v1234567890/additional_image.jpg",
      "media_type": "IMAGE",
      "is_thumbnail": false,
      "moderation_status": "APPROVED"
    }
  }
}
```

---

### 11. Update Issue Thumbnail
Change the thumbnail image for an issue.

**Endpoint:** `PUT /api/issues/:issueId/thumbnail`

**Request Body:**
```json
{
  "thumbnailUrl": "https://res.cloudinary.com/naagrik/image/upload/v1234567890/new_thumbnail.jpg"
}
```

---

### 12. Remove Media from Issue
Remove a media file from an issue.

**Endpoint:** `DELETE /api/issues/media/:mediaId`

**Response:**
```json
{
  "success": true,
  "message": "Media removed from issue successfully",
  "data": {
    "removedMedia": {
      "id": "media-uuid",
      "media_url": "https://res.cloudinary.com/naagrik/image/upload/v1234567890/removed_image.jpg"
    }
  }
}
```

---

## Error Responses

### Common Error Codes:
- `400` - Bad Request (validation errors, missing fields)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (issue doesn't exist)
- `500` - Internal Server Error

### Error Response Format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

---

## Usage Examples

### Frontend Integration

#### Creating an Issue with Media
```javascript
// 1. First upload media files
const formData = new FormData();
formData.append('media', file1);
formData.append('media', file2);

const uploadResponse = await fetch('/api/upload/issue-media', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { data: mediaUrls } = await uploadResponse.json();

// 2. Create issue with media URLs
const issueData = {
  title: 'Pothole Issue',
  description: 'Large pothole needs repair',
  categoryId: 1,
  locationLat: 40.7128,
  locationLng: -74.0060,
  address: '123 Main St',
  mediaUrls: mediaUrls
};

const issueResponse = await fetch('/api/issues', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(issueData)
});
```

#### Fetching Issues Near Location
```javascript
const nearbyIssues = await fetch('/api/issues?' + new URLSearchParams({
  nearLat: userLocation.lat,
  nearLng: userLocation.lng,
  radius: 5,
  status: 'OPEN',
  page: 1,
  limit: 20
}), {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

#### Voting on an Issue
```javascript
const voteResponse = await fetch(`/api/issues/${issueId}/vote`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ voteType: 1 }) // 1 for upvote
});
```

---

## Status Workflow

1. **OPEN** - Initial status when issue is created
2. **ACKNOWLEDGED** - Issue has been seen by authorities
3. **IN_PROGRESS** - Work is being done to resolve the issue
4. **RESOLVED** - Issue has been fixed
5. **ARCHIVED** - Issue is no longer relevant or was deleted
6. **DUPLICATE** - Issue is a duplicate of another issue

---

## Permissions

- **CITIZEN**: Can create, view, vote on, and comment on issues
- **STEWARD**: Can change issue status, add steward notes, moderate content
- **SUPER_ADMIN**: Full access to all issue operations

---

## Rate Limiting

- **Creation**: 10 issues per hour per user
- **Voting**: 100 votes per hour per user
- **Comments**: 50 comments per hour per user

---

## Best Practices

1. **Always include location data** for better issue tracking
2. **Upload clear, relevant media** to help authorities understand the issue
3. **Provide detailed descriptions** for faster resolution
4. **Use appropriate categories** for better organization
5. **Check for duplicates** before creating new issues
6. **Vote responsibly** to maintain community trust
