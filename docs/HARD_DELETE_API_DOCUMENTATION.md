# Hard Delete API Documentation

## Overview
The Hard Delete API provides functionality to permanently delete issues and all their connected data, including media files from both the database and Cloudinary storage.

**⚠️ WARNING**: Hard delete operations are irreversible and will permanently remove all data associated with an issue.

## API Endpoints

### Hard Delete Issue
Permanently deletes an issue and all connected data including votes, comments, media, and history.

**Endpoint**: `DELETE /api/issues/:issueId/hard-delete`

**Authentication**: Required (JWT Token)

**Authorization**: 
- SUPER_ADMIN: Can delete any issue
- Issue Owner: Can only delete their own issues

**Parameters**:
- `issueId` (UUID, required): The ID of the issue to permanently delete

**Request Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Issue and all connected data permanently deleted",
    "deletedData": {
      "issue": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "title": "Deleted Issue Title",
        "description": "Issue description",
        "status": "OPEN",
        "user_id": "user-uuid",
        "created_at": "2024-01-15T10:30:00Z"
      },
      "mediaFiles": 3,
      "cloudinaryCleanup": [
        {
          "mediaId": "media-uuid-1",
          "publicId": "naagrik/issues/image123",
          "success": true,
          "result": {"result": "ok"}
        },
        {
          "mediaId": "media-uuid-2", 
          "publicId": "naagrik/issues/video456",
          "success": true,
          "result": {"result": "ok"}
        }
      ],
      "cleanupCompleted": true
    }
  },
  "message": "Issue permanently deleted with all connected data"
}
```

**Error Responses**:

**400 - Validation Error**:
```json
{
  "success": false,
  "data": null,
  "message": "Validation error",
  "errors": [
    {
      "field": "issueId",
      "message": "Valid issue ID is required"
    }
  ]
}
```

**401 - Unauthorized**:
```json
{
  "success": false,
  "data": null,
  "message": "Access token required"
}
```

**403 - Forbidden**:
```json
{
  "success": false,
  "data": null,
  "message": "You do not have permission to permanently delete this issue"
}
```

**404 - Not Found**:
```json
{
  "success": false,
  "data": null,
  "message": "Issue not found"
}
```

**500 - Server Error**:
```json
{
  "success": false,
  "data": null,
  "message": "Internal server error"
}
```

## What Gets Deleted

The hard delete operation removes the following data permanently:

### Database Records
1. **Issue Record**: The main issue entry
2. **Votes**: All upvotes and downvotes on the issue
3. **Comments**: All comments and nested replies
4. **Comment Flags**: All flags on comments related to the issue
5. **Issue History**: All status change history
6. **Media Records**: All media file database entries

### External Resources
1. **Cloudinary Assets**: All images and videos uploaded for the issue
2. **Cache Entries**: All cached data related to the issue

## Implementation Details

### Transaction Safety
- All database operations are wrapped in a transaction
- If any database operation fails, all changes are rolled back
- Media cleanup from Cloudinary happens after successful database deletion
- Failed Cloudinary deletions don't rollback the database transaction

### Media Cleanup Process
1. Retrieve all media URLs for the issue
2. Delete database records in transaction
3. Extract public IDs from Cloudinary URLs using `extractPublicId` utility
4. Delete each asset from Cloudinary using appropriate resource type (image/video)
5. Log any Cloudinary deletion failures but continue processing

### Cache Invalidation
After successful deletion, the following cache patterns are cleared:
- `issue_{issueId}*`: Issue-specific cache entries
- `issues_*`: General issue listing caches
- `dashboard_*`: Dashboard statistic caches

## Usage Examples

### Delete Own Issue (Issue Owner)
```javascript
// JavaScript/Frontend
const response = await fetch('/api/issues/123e4567-e89b-12d3-a456-426614174000/hard-delete', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
```

### Delete Any Issue (SUPER_ADMIN)
```javascript
// Same API call, but SUPER_ADMIN can delete any issue
const response = await fetch('/api/issues/any-issue-uuid/hard-delete', {
  method: 'DELETE', 
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }
});
```

### cURL Example
```bash
curl -X DELETE \
  http://localhost:3000/api/issues/123e4567-e89b-12d3-a456-426614174000/hard-delete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## Security Considerations

1. **Authentication Required**: Must provide valid JWT token
2. **Authorization Check**: Only SUPER_ADMIN or issue owner can perform hard delete
3. **UUID Validation**: Issue ID must be a valid UUID format
4. **Audit Trail**: Hard deletes are not logged since the data is permanently removed
5. **No Soft Delete**: This is a permanent operation with no recovery option

## Error Handling

### Database Errors
- Transaction rollback ensures data consistency
- Failed operations return detailed error messages
- Connection management prevents connection leaks

### Cloudinary Errors  
- Individual media deletion failures are logged but don't stop the process
- Failed Cloudinary deletions are reported in the response
- Database deletion proceeds even if some media cleanup fails

## Performance Considerations

1. **Large Issues**: Issues with many comments/media may take longer to delete
2. **Network Latency**: Cloudinary deletions depend on external API response times  
3. **Cache Clearing**: Pattern-based cache invalidation ensures consistency
4. **Database Locks**: Transaction may briefly lock related records

## Related APIs

- **Soft Delete**: `DELETE /api/issues/:id` (sets status to ARCHIVED)
- **Media Delete**: `DELETE /api/issues/media/:mediaId` (single media file)
- **Issue Status**: `PUT /api/issues/:id/status` (change status without deletion)

## Best Practices

1. **Confirmation**: Always show confirmation dialog before hard delete
2. **Backup**: Consider backing up important issues before deletion
3. **Permissions**: Restrict hard delete to authorized users only
4. **Logging**: Log hard delete operations for security auditing
5. **User Experience**: Provide clear feedback about what will be deleted

## Testing

### Test Cases
1. Issue owner deletes own issue
2. SUPER_ADMIN deletes any issue
3. Regular user tries to delete others' issues (should fail)
4. Delete issue with multiple media files
5. Delete issue with nested comments
6. Handle Cloudinary deletion failures gracefully

### Test Data Cleanup
When testing, use the hard delete API to clean up test issues and avoid cluttering the database.
