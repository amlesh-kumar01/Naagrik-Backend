# Updated Comments API Documentation with Nested Structure

## Database Changes Summary

### ✅ **Migration Completed**
- Added `parent_comment_id UUID` for nested replies
- Added `is_flagged BOOLEAN` for moderation
- Added `flag_count INTEGER` to track flags
- Added `updated_at TIMESTAMPTZ` for edit tracking
- Created `comment_flags` table for detailed flag tracking
- Added CASCADE DELETE for automatic reply removal

---

## **Comments API Endpoints**

### **1. Get Comments for Issue**

#### **Endpoint**
```http
GET /api/comments/issues/:issueId/comments
```

#### **Authentication**
- Optional (enhanced features for authenticated users)

#### **Query Parameters**
| Parameter | Type | Required | Default | Validation |
|-----------|------|----------|---------|------------|
| nested | String | No | 'true' | 'true' or 'false' |
| sortBy | String | No | 'oldest' | 'oldest' or 'newest' |

#### **Response (Nested Structure)**
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment-uuid",
        "content": "This is a top-level comment",
        "user_id": "user-uuid",
        "user_name": "John Doe",
        "user_reputation": 150,
        "issue_id": "issue-uuid",
        "parent_comment_id": null,
        "is_flagged": false,
        "flag_count": 0,
        "created_at": "2025-08-30T14:00:00Z",
        "updated_at": "2025-08-30T14:00:00Z",
        "replies": [
          {
            "id": "reply-uuid",
            "content": "This is a reply to the comment",
            "user_id": "user2-uuid",
            "user_name": "Jane Smith",
            "user_reputation": 75,
            "parent_comment_id": "comment-uuid",
            "is_flagged": false,
            "flag_count": 0,
            "created_at": "2025-08-30T15:00:00Z",
            "updated_at": "2025-08-30T15:00:00Z",
            "replies": []
          }
        ]
      }
    ],
    "nested": true
  },
  "message": "Comments retrieved successfully"
}
```

---

### **2. Create Comment or Reply**

#### **Endpoint**
```http
POST /api/comments/issues/:issueId/comments
```

#### **Authentication**
- Required: Bearer token

#### **Rate Limiting**
- Applied via `commentRateLimit()`

#### **Request Body**
```json
{
  "content": "This is my comment or reply",
  "parentCommentId": "parent-uuid" // Optional - for replies
}
```

#### **Validation Rules**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| content | String | Yes | Min: 1 char, Max: 1000 chars, Trimmed |
| parentCommentId | UUID | No | Valid UUID, must exist, must belong to same issue |

#### **Business Rules**
- If `parentCommentId` is provided, creates a reply
- If `parentCommentId` is null/missing, creates top-level comment
- Parent comment must belong to the same issue
- Increases user reputation by +1 point

#### **Response**
```json
{
  "success": true,
  "data": {
    "comment": {
      "id": "new-comment-uuid",
      "content": "This is my comment or reply",
      "user_id": "user-uuid",
      "issue_id": "issue-uuid",
      "parent_comment_id": "parent-uuid", // null for top-level
      "is_flagged": false,
      "flag_count": 0,
      "created_at": "2025-08-30T16:00:00Z",
      "updated_at": "2025-08-30T16:00:00Z"
    }
  },
  "message": "Reply created successfully" // or "Comment created successfully"
}
```

---

### **3. Update Comment**

#### **Endpoint**
```http
PUT /api/comments/:commentId
```

#### **Authentication**
- Required: Bearer token (comment author only)

#### **Request Body**
```json
{
  "content": "Updated comment content"
}
```

#### **Validation Rules**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| content | String | Yes | Min: 1 char, Max: 1000 chars, Trimmed |

#### **Response**
```json
{
  "success": true,
  "data": {
    "comment": {
      "id": "comment-uuid",
      "content": "Updated comment content",
      "updated_at": "2025-08-30T16:30:00Z"
    }
  },
  "message": "Comment updated successfully"
}
```

---

### **4. Delete Comment**

#### **Endpoint**
```http
DELETE /api/comments/:commentId
```

#### **Authentication**
- Required: Bearer token

#### **Authorization**
- Comment author: Can delete own comments
- Steward/Admin: Can delete any comments

#### **Cascading Behavior**
- **Automatically deletes ALL replies** when parent comment is deleted
- Uses database CASCADE DELETE constraint
- Returns count of deleted replies

#### **Response**
```json
{
  "success": true,
  "data": {
    "deletedComment": {
      "id": "comment-uuid",
      "content": "Deleted comment content"
    },
    "deletedRepliesCount": 3
  },
  "message": "Comment and 3 replies deleted successfully"
}
```

---

### **5. Flag Comment**

#### **Endpoint**
```http
POST /api/comments/:commentId/flag
```

#### **Authentication**
- Required: Bearer token
- Cannot flag own comments

#### **Request Body**
```json
{
  "reason": "INAPPROPRIATE",
  "details": "Contains offensive language"
}
```

#### **Validation Rules**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| reason | String | No | Enum: 'SPAM', 'INAPPROPRIATE', 'MISLEADING', 'HARASSMENT', 'OTHER' |
| details | String | No | Max: 500 chars, Trimmed |

#### **Business Rules**
- Cannot flag own comments
- One flag per user per comment
- Comment marked as flagged when 3+ flags received
- Auto-escalates to moderation queue

#### **Response**
```json
{
  "success": true,
  "data": {
    "flag": {
      "id": "flag-uuid",
      "comment_id": "comment-uuid",
      "user_id": "flagger-uuid",
      "reason": "INAPPROPRIATE",
      "details": "Contains offensive language",
      "status": "PENDING",
      "created_at": "2025-08-30T16:00:00Z"
    },
    "comment": {
      "id": "comment-uuid",
      "is_flagged": true,
      "flag_count": 3
    }
  },
  "message": "Comment flagged and marked for review"
}
```

---

### **6. Get Flagged Comments (Steward/Admin)**

#### **Endpoint**
```http
GET /api/comments/flagged
```

#### **Authentication**
- Required: Steward or Admin token

#### **Query Parameters**
| Parameter | Type | Required | Default | Validation |
|-----------|------|----------|---------|------------|
| limit | Integer | No | 50 | Min: 1, Max: 100 |
| offset | Integer | No | 0 | Min: 0 |

#### **Response**
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment-uuid",
        "content": "Flagged comment content",
        "user_name": "Comment Author",
        "issue_title": "Related Issue Title",
        "is_flagged": true,
        "flag_count": 4,
        "total_flags": 4,
        "flag_reasons": ["INAPPROPRIATE", "HARASSMENT"],
        "created_at": "2025-08-29T10:00:00Z"
      }
    ]
  },
  "message": "Flagged comments retrieved successfully"
}
```

---

### **7. Review Flagged Comment (Steward/Admin)**

#### **Endpoint**
```http
PUT /api/comments/:commentId/review
```

#### **Authentication**
- Required: Steward or Admin token

#### **Request Body**
```json
{
  "action": "DELETE", // or "APPROVE"
  "feedback": "Comment violates community guidelines"
}
```

#### **Validation Rules**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| action | String | Yes | Enum: 'APPROVE', 'DELETE' |
| feedback | String | No | Max: 1000 chars, Trimmed |

#### **Response for DELETE**
```json
{
  "success": true,
  "data": {
    "action": "deleted",
    "comment": {
      "id": "comment-uuid",
      "content": "Deleted comment content"
    }
  },
  "message": "Comment deleted successfully"
}
```

#### **Response for APPROVE**
```json
{
  "success": true,
  "data": {
    "action": "approved",
    "commentId": "comment-uuid"
  },
  "message": "Comment approved and flags cleared"
}
```

---

## **Key Features of Updated System**

### ✅ **Nested Comments (Replies)**
- Support for unlimited nesting depth
- Parent-child relationships tracked in database
- Automatic reply deletion when parent is deleted

### ✅ **Enhanced Flagging System**
- Detailed flag tracking with reasons
- Multiple flags per comment from different users
- Automatic escalation to moderation queue
- Admin review workflow

### ✅ **Cascade Deletion**
- **When parent comment is deleted → ALL replies are deleted**
- Uses database constraints for data integrity
- Returns count of deleted replies

### ✅ **Improved Performance**
- Optimized indexes for parent lookups
- Efficient nested query structure
- Proper timestamp tracking

---

## **Error Responses**

### **Parent Comment Validation (400)**
```json
{
  "success": false,
  "error": {
    "message": "Parent comment must belong to the same issue",
    "code": "INVALID_PARENT_COMMENT"
  }
}
```

### **Duplicate Flag (409)**
```json
{
  "success": false,
  "error": {
    "message": "You have already flagged this comment",
    "code": "DUPLICATE_FLAG"
  }
}
```

### **Self-Flag Prevention (400)**
```json
{
  "success": false,
  "error": {
    "message": "You cannot flag your own comment",
    "code": "SELF_FLAG_NOT_ALLOWED"
  }
}
```

---

## **Frontend Integration for Nested Comments**

```javascript
class NestedCommentService {
  // Create top-level comment
  async createComment(issueId, content) {
    return await fetch(`/api/comments/issues/${issueId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ content })
    });
  }

  // Create reply to comment
  async createReply(issueId, parentCommentId, content) {
    return await fetch(`/api/comments/issues/${issueId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ content, parentCommentId })
    });
  }

  // Get nested comments
  async getNestedComments(issueId) {
    return await fetch(`/api/comments/issues/${issueId}/comments?nested=true&sortBy=oldest`);
  }

  // Delete comment (will delete all replies)
  async deleteComment(commentId) {
    return await fetch(`/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
  }
}
```

The updated system now supports:
- ✅ **Nested comments with unlimited depth**
- ✅ **Automatic cascade deletion of replies**
- ✅ **Enhanced flagging system**
- ✅ **Proper moderation workflow**
- ✅ **Performance optimizations**
