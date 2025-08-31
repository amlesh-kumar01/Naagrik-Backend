# Issue Management API Documentation

## Overview
This document provides comprehensive documentation for issue status management and deletion APIs in the Naagrik platform.

## Available Issue Statuses
The system supports the following issue statuses:
- `OPEN` - Initial status when issue is reported
- `ACKNOWLEDGED` - Issue has been seen and acknowledged by steward
- `IN_PROGRESS` - Issue is being actively worked on
- `RESOLVED` - Issue has been fixed/resolved
- `ARCHIVED` - Issue has been archived/deleted (soft delete)

## Endpoints

### 1. Update Issue Status
**PUT** `/api/issues/:id/status`

#### Description
Updates the status of an issue. Only stewards with category access or super admins can update issue status.

#### Authentication
- **Required**: Bearer token
- **Roles**: STEWARD (with category access), SUPER_ADMIN

#### Parameters
- **Path Parameter**: `id` (UUID) - Issue ID
- **Body Parameters**:
  - `status` (string, required) - New status value
  - `reason` (string, optional) - Reason for status change (max 500 chars)

#### Request Example
```bash
PUT /api/issues/47675200-731e-4332-84ff-3b0fef8dd8b3/status
Authorization: Bearer <steward_token>
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "reason": "Started working on fixing the pothole"
}
```

#### Response Examples

##### Success Response
**Status Code**: `200 OK`
```json
{
  "success": true,
  "message": "Issue status updated successfully",
  "data": {
    "issue": {
      "id": "47675200-731e-4332-84ff-3b0fef8dd8b3",
      "title": "Pothole on Academic Area Road",
      "status": "IN_PROGRESS",
      "updated_at": "2025-08-31T14:30:00.000Z",
      "resolved_at": null
    }
  }
}
```

##### Error Responses
**Access Denied** - `403 Forbidden`
```json
{
  "success": false,
  "message": "Access denied: You are not authorized to manage this category in this zone"
}
```

**Citizens Cannot Update** - `403 Forbidden`
```json
{
  "success": false,
  "message": "Access denied: Citizens cannot update issue status"
}
```

#### Business Logic
1. **Permission Check**: Verifies user has authority to update the issue
   - Stewards: Must be assigned to the issue's category in that zone
   - Super Admins: Can update any issue
   - Citizens: Cannot update issue status
2. **Status Update**: Updates issue status and timestamp
3. **Resolved Status**: Sets `resolved_at` timestamp when status becomes 'RESOLVED'
4. **History Tracking**: Creates entry in issue_history table
5. **Reputation**: Awards +10 reputation to issue reporter when resolved

---

### 2. Delete Issue (Soft Delete)
**DELETE** `/api/issues/:id`

#### Description
Soft deletes an issue by setting its status to 'ARCHIVED'. Only issue owners or stewards/admins can delete issues.

#### Authentication
- **Required**: Bearer token
- **Roles**: Issue owner (CITIZEN), STEWARD, SUPER_ADMIN

#### Parameters
- **Path Parameter**: `id` (UUID) - Issue ID

#### Request Example
```bash
DELETE /api/issues/47675200-731e-4332-84ff-3b0fef8dd8b3
Authorization: Bearer <token>
```

#### Response Examples

##### Success Response
**Status Code**: `200 OK`
```json
{
  "success": true,
  "message": "Issue deleted successfully",
  "data": {
    "issue": {
      "id": "47675200-731e-4332-84ff-3b0fef8dd8b3",
      "title": "Pothole on Academic Area Road",
      "status": "ARCHIVED",
      "updated_at": "2025-08-31T14:30:00.000Z"
    }
  }
}
```

##### Error Responses
**Not Found** - `404 Not Found`
```json
{
  "success": false,
  "message": "Issue not found"
}
```

**Permission Denied** - `403 Forbidden`
```json
{
  "success": false,
  "message": "You can only delete your own issues"
}
```

#### Business Logic
1. **Existence Check**: Verifies issue exists
2. **Permission Check**: 
   - Citizens: Can only delete their own issues
   - Stewards/Admins: Can delete any issue
3. **Soft Delete**: Changes status to 'ARCHIVED' (preserves data)
4. **History Tracking**: Records deletion in issue_history

---

### 3. Hard Delete Issue (Permanent Delete)
**DELETE** `/api/issues/:issueId/hard-delete`

#### Description
Permanently deletes an issue and all associated data. Only super admins or issue owners can perform hard delete.

#### Authentication
- **Required**: Bearer token
- **Roles**: SUPER_ADMIN, Issue owner

#### Parameters
- **Path Parameter**: `issueId` (UUID) - Issue ID

#### Request Example
```bash
DELETE /api/issues/47675200-731e-4332-84ff-3b0fef8dd8b3/hard-delete
Authorization: Bearer <super_admin_token>
```

#### Response Examples

##### Success Response
**Status Code**: `200 OK`
```json
{
  "success": true,
  "message": "Issue permanently deleted successfully",
  "data": {
    "issueId": "47675200-731e-4332-84ff-3b0fef8dd8b3",
    "deletedRecords": {
      "issue": 1,
      "media": 2,
      "comments": 5,
      "votes": 12,
      "history": 8
    }
  }
}
```

#### Business Logic
1. **Permission Check**: Only super admins and issue owners
2. **Cascade Delete**: Removes all associated data
   - Issue media files
   - Comments and nested comments
   - Votes
   - Issue history
   - The issue record itself
3. **Permanent Removal**: Cannot be recovered

---

### 4. Bulk Status Update
**PUT** `/api/issues/bulk/status`

#### Description
Updates status of multiple issues at once. Only stewards and admins can perform bulk updates.

#### Authentication
- **Required**: Bearer token
- **Roles**: STEWARD, SUPER_ADMIN

#### Parameters
- **Body Parameters**:
  - `issueIds` (array, required) - Array of issue UUIDs
  - `status` (string, required) - New status for all issues
  - `reason` (string, optional) - Reason for bulk update

#### Request Example
```bash
PUT /api/issues/bulk/status
Authorization: Bearer <steward_token>
Content-Type: application/json

{
  "issueIds": [
    "47675200-731e-4332-84ff-3b0fef8dd8b3",
    "8d189a71-3ba8-4b49-b7ef-9b2589c2e811"
  ],
  "status": "RESOLVED",
  "reason": "Fixed during maintenance work"
}
```

#### Response Example
**Status Code**: `200 OK`
```json
{
  "success": true,
  "message": "Bulk status update completed",
  "data": {
    "updated": 2,
    "failed": 0,
    "results": [
      {
        "issueId": "47675200-731e-4332-84ff-3b0fef8dd8b3",
        "success": true,
        "newStatus": "RESOLVED"
      },
      {
        "issueId": "8d189a71-3ba8-4b49-b7ef-9b2589c2e811",
        "success": true,
        "newStatus": "RESOLVED"
      }
    ]
  }
}
```

---

### 5. Mark Issue as Duplicate
**POST** `/api/issues/:id/mark-duplicate`

#### Description
Marks an issue as duplicate and links it to the primary issue.

#### Authentication
- **Required**: Bearer token
- **Roles**: STEWARD (with category access), SUPER_ADMIN

#### Parameters
- **Path Parameter**: `id` (UUID) - Duplicate issue ID
- **Body Parameters**:
  - `primaryIssueId` (UUID, required) - ID of the primary issue
  - `reason` (string, optional) - Reason for marking as duplicate

#### Request Example
```bash
POST /api/issues/47675200-731e-4332-84ff-3b0fef8dd8b3/mark-duplicate
Authorization: Bearer <steward_token>
Content-Type: application/json

{
  "primaryIssueId": "8d189a71-3ba8-4b49-b7ef-9b2589c2e811",
  "reason": "Same pothole issue reported multiple times"
}
```

## Implementation Examples

### JavaScript/Fetch - Update Status
```javascript
const updateIssueStatus = async (issueId, status, reason, token) => {
  try {
    const response = await fetch(`/api/issues/${issueId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, reason })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('Status updated:', result.data.issue);
    } else {
      console.error('Update failed:', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### PowerShell - Delete Issue
```powershell
$headers = @{ "Authorization" = "Bearer <token>" }
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/issues/<issueId>" -Headers $headers -Method DELETE
Write-Output $response
```

### cURL - Bulk Update
```bash
curl -X PUT \
  http://localhost:5000/api/issues/bulk/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "issueIds": ["issue-id-1", "issue-id-2"],
    "status": "RESOLVED",
    "reason": "Fixed during maintenance"
  }'
```

## Status Workflow

### Typical Issue Lifecycle
```
OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED
  ↓                                      ↓
ARCHIVED (deleted)                   ARCHIVED (if needed)
  ↓
DUPLICATE (if duplicate found)
```

### Status Transition Rules
- **OPEN**: Initial status, can move to any other status
- **ACKNOWLEDGED**: Steward has seen the issue
- **IN_PROGRESS**: Work has started
- **RESOLVED**: Issue is fixed (sets resolved_at timestamp)
- **ARCHIVED**: Soft deleted (hidden from normal views)
- **DUPLICATE**: Marked as duplicate of another issue

## Permission Matrix

| Role | Update Status | Delete Own | Delete Any | Hard Delete | Bulk Update |
|------|---------------|------------|------------|-------------|-------------|
| CITIZEN | ❌ | ✅ | ❌ | ✅ (own only) | ❌ |
| STEWARD | ✅ (category access) | ✅ | ✅ | ❌ | ✅ |
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |

## Error Handling

### Common Error Codes
- `400` - Invalid request data (validation errors)
- `401` - Authentication required
- `403` - Access denied (permission issues)
- `404` - Issue not found
- `500` - Server error

### Validation Errors
All endpoints validate input data and return detailed error messages for:
- Invalid UUIDs
- Invalid status values
- Missing required fields
- Text length limits

## Database Impact

### Tables Modified
- `issues`: Status, timestamps, assignments
- `issue_history`: Change tracking
- `users`: Reputation updates (on resolution)

### Indexes Used
- `idx_issues_status`: For status-based queries
- `idx_issues_assigned_steward`: For steward assignments
- `idx_issue_history_issue_id`: For history tracking

## Performance Considerations

1. **Status Updates**: Single transaction with history logging
2. **Bulk Operations**: Batch processing with rollback on failure
3. **Permission Checks**: Cached steward category assignments
4. **Reputation Updates**: Asynchronous when possible

## Security Features

1. **Role-Based Access**: Strict permission enforcement
2. **Category Access**: Stewards limited to assigned categories/zones
3. **Audit Trail**: All changes logged in issue_history
4. **Input Validation**: Comprehensive request validation
5. **Transaction Safety**: Database consistency maintained
