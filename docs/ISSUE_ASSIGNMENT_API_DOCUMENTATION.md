# Issue Assignment API Documentation

## Overview
This API endpoint allows stewards to check if an issue is assigned to someone and automatically assign it to themselves if it's unassigned.

## Endpoint Details

### Check and Assign Issue
**POST** `/api/stewards/issues/:issueId/assign`

#### Description
- Checks if an issue is already assigned to a steward
- If unassigned, assigns the issue to the requesting steward
- Updates issue status from 'OPEN' to 'ACKNOWLEDGED' when assigning
- Creates an issue history entry for tracking

#### Authentication
- **Required**: Bearer token
- **Role**: STEWARD

#### Parameters
- **Path Parameter**: `issueId` (UUID) - The ID of the issue to check/assign

#### Request Example
```bash
POST /api/stewards/issues/8d189a71-3ba8-4b49-b7ef-9b2589c2e811/assign
Authorization: Bearer <your_steward_token>
```

#### Response Scenarios

##### 1. Success - Issue Assigned to You
**Status Code**: `200 OK`
```json
{
  "success": true,
  "message": "Issue successfully assigned to you",
  "data": {
    "isAssigned": true,
    "assignedTo": "aea8ecea-d96e-4225-8cd8-5d9901ee35a1",
    "isCurrentSteward": true,
    "previousStatus": "OPEN",
    "newStatus": "ACKNOWLEDGED"
  }
}
```

##### 2. Already Assigned to You
**Status Code**: `200 OK`
```json
{
  "success": true,
  "message": "Issue is already assigned to you",
  "data": {
    "isAssigned": true,
    "assignedTo": "aea8ecea-d96e-4225-8cd8-5d9901ee35a1",
    "isCurrentSteward": true
  }
}
```

##### 3. Already Assigned to Another Steward
**Status Code**: `409 Conflict`
```json
{
  "success": true,
  "message": "Issue is already assigned to another steward",
  "data": {
    "isAssigned": true,
    "assignedTo": "different-steward-id",
    "isCurrentSteward": false
  }
}
```

##### 4. No Authority (Not assigned to category/zone)
**Status Code**: `500 Internal Server Error`
```json
{
  "success": false,
  "message": "You do not have authority to assign this issue. You are not assigned to this category in this zone.",
  "error": "Error: Error checking/assigning issue: You do not have authority to assign this issue. You are not assigned to this category in this zone."
}
```

##### 5. Issue Not Found
**Status Code**: `500 Internal Server Error`
```json
{
  "success": false,
  "message": "Issue not found",
  "error": "Error: Error checking/assigning issue: Issue not found"
}
```

##### 6. Missing Issue ID
**Status Code**: `400 Bad Request`
```json
{
  "success": false,
  "message": "Issue ID is required",
  "data": null
}
```

## Business Logic

### Authority Check
Before assigning an issue, the system verifies that the steward has authority by checking:
1. The steward is assigned to the issue's category
2. The assignment is for the same zone as the issue
3. The steward's category assignment is active

### Status Updates
- When an issue is assigned, its status changes from `OPEN` to `ACKNOWLEDGED`
- Other statuses remain unchanged during assignment
- The `updated_at` timestamp is updated

### History Tracking
- Creates an entry in `issue_history` table
- Records the status change and assignment action
- Links to the steward who performed the assignment

## Usage Examples

### JavaScript/Fetch
```javascript
const assignIssue = async (issueId, token) => {
  try {
    const response = await fetch(`/api/stewards/issues/${issueId}/assign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('Assignment result:', result.data);
    } else {
      console.error('Assignment failed:', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### cURL
```bash
curl -X POST \
  http://localhost:5000/api/stewards/issues/8d189a71-3ba8-4b49-b7ef-9b2589c2e811/assign \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json"
```

### PowerShell
```powershell
$headers = @{ "Authorization" = "Bearer <your_token>" }
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/stewards/issues/8d189a71-3ba8-4b49-b7ef-9b2589c2e811/assign" -Headers $headers -Method POST
Write-Output $response
```

## Related Endpoints

### Get My Issues
```
GET /api/stewards/issues/me
```
Returns all issues manageable by the steward (assigned zones/categories).

### Get Issue Details
```
GET /api/issues/:issueId
```
Returns detailed information about a specific issue.

### Add Steward Note
```
POST /api/stewards/issues/:issueId/notes
```
Add a note to an issue (typically used after assignment).

## Error Handling

The endpoint handles various error scenarios:

1. **Authentication Errors**: Invalid or missing token
2. **Authorization Errors**: User is not a steward
3. **Validation Errors**: Missing or invalid issue ID
4. **Business Logic Errors**: No authority over the issue
5. **Database Errors**: Issue not found, connection issues

## Database Impact

### Tables Modified
- `issues`: Updates `assigned_steward_id`, `status`, `updated_at`
- `issue_history`: Inserts new tracking record

### Indexes Used
- `idx_issues_assigned_steward`: For checking current assignments
- `idx_steward_categories_composite`: For authority verification

## Security Considerations

1. **Role-Based Access**: Only stewards can use this endpoint
2. **Authority Verification**: Stewards can only assign issues in their zones/categories
3. **Audit Trail**: All assignments are logged in issue history
4. **Input Validation**: Issue ID format validation

## Performance Notes

- The endpoint performs multiple database queries but they are optimized with indexes
- Authority checks are fast due to composite indexes on steward_categories
- Consider caching steward assignments for high-traffic scenarios
