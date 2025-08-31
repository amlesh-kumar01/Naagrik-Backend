# Issue Status Update API - Complete Guide

## 🎯 **API Endpoint**
**`PUT /api/issues/:id/status`**

## 📋 **Overview**
This API allows stewards and administrators to update the status of issues. The endpoint includes comprehensive validation, permission checking, and audit trail functionality.

## 🔐 **Authentication & Authorization**
- **Authentication**: Bearer token required
- **Roles**: STEWARD (with category access), SUPER_ADMIN
- **Permission Check**: Stewards can only update issues in their assigned categories/zones

## 📊 **Available Statuses**
| Status | Description | When to Use |
|--------|-------------|-------------|
| `OPEN` | Issue is reported and awaiting attention | Initial status |
| `ACKNOWLEDGED` | Issue has been seen by steward | When steward first sees the issue |
| `IN_PROGRESS` | Work is actively being done | When repair/resolution work starts |
| `RESOLVED` | Issue has been fixed | When problem is completely solved |
| `ARCHIVED` | Issue is archived/deleted | When issue needs to be hidden |

## 🔧 **Request Format**

### **URL Structure**
```
PUT /api/issues/{issueId}/status
```

### **Headers**
```
Authorization: Bearer {your_steward_token}
Content-Type: application/json
```

### **Request Body**
```json
{
  "status": "IN_PROGRESS",
  "reason": "Started working on fixing the pothole"
}
```

### **Parameters**
- **Path Parameter**:
  - `id` (UUID, required) - The issue ID to update
- **Body Parameters**:
  - `status` (string, required) - New status value
  - `reason` (string, optional) - Reason for status change (max 500 characters)

## 📝 **Complete Examples**

### **Example 1: Acknowledge Issue**
```bash
# cURL
curl -X PUT \
  "http://localhost:5000/api/issues/47675200-731e-4332-84ff-3b0fef8dd8b3/status" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ACKNOWLEDGED",
    "reason": "Issue has been reviewed and will be addressed"
  }'
```

```javascript
// JavaScript/Fetch
const acknowledgeIssue = async (issueId, token) => {
  const response = await fetch(`/api/issues/${issueId}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'ACKNOWLEDGED',
      reason: 'Issue has been reviewed and will be addressed'
    })
  });
  
  const result = await response.json();
  return result;
};
```

```powershell
# PowerShell
$headers = @{ 
  "Authorization" = "Bearer <your_token>"
  "Content-Type" = "application/json"
}
$body = @{
  status = "ACKNOWLEDGED"
  reason = "Issue has been reviewed and will be addressed"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/issues/47675200-731e-4332-84ff-3b0fef8dd8b3/status" -Headers $headers -Method PUT -Body $body
```

### **Example 2: Start Work on Issue**
```json
PUT /api/issues/47675200-731e-4332-84ff-3b0fef8dd8b3/status

{
  "status": "IN_PROGRESS",
  "reason": "Municipal team dispatched to fix the pothole. Expected completion: 2 days"
}
```

### **Example 3: Resolve Issue**
```json
PUT /api/issues/47675200-731e-4332-84ff-3b0fef8dd8b3/status

{
  "status": "RESOLVED",
  "reason": "Pothole has been filled and road surface restored. Work completed on 2025-08-31"
}
```

## ✅ **Success Responses**

### **Status Update Success**
**HTTP Status**: `200 OK`
```json
{
  "success": true,
  "message": "Issue status updated successfully",
  "data": {
    "issue": {
      "id": "47675200-731e-4332-84ff-3b0fef8dd8b3",
      "user_id": "d90f902a-29ad-450c-bb6e-b4b1cff1bcc9",
      "category_id": 21,
      "zone_id": "28086ea1-6dc3-41ca-a294-746ba707a1ff",
      "title": "Pothole on Academic Area Road",
      "description": "There is a large pothole on the road near the Academic Area...",
      "status": "IN_PROGRESS",
      "location_lat": "22.31490000",
      "location_lng": "87.31050000",
      "address": "Academic Area Road, IIT Kharagpur",
      "vote_score": 4,
      "urgency_score": 7,
      "ai_flag": false,
      "assigned_steward_id": "aea8ecea-d96e-4225-8cd8-5d9901ee35a1",
      "created_at": "2025-08-30T04:05:25.591Z",
      "updated_at": "2025-08-31T15:30:45.123Z",
      "resolved_at": null
    }
  }
}
```

### **Resolution Success (Special Case)**
When status is updated to `RESOLVED`, additional data is returned:
```json
{
  "success": true,
  "message": "Issue status updated successfully",
  "data": {
    "issue": {
      "id": "47675200-731e-4332-84ff-3b0fef8dd8b3",
      "status": "RESOLVED",
      "resolved_at": "2025-08-31T15:30:45.123Z",
      "updated_at": "2025-08-31T15:30:45.123Z",
      // ... other issue fields
    }
  }
}
```

## ❌ **Error Responses**

### **Validation Errors**
**HTTP Status**: `400 Bad Request`
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "status",
      "message": "Valid status is required"
    }
  ]
}
```

### **Invalid Issue ID**
**HTTP Status**: `400 Bad Request`
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "id",
      "message": "Valid issue ID is required"
    }
  ]
}
```

### **Issue Not Found**
**HTTP Status**: `500 Internal Server Error`
```json
{
  "success": false,
  "message": "Issue not found",
  "error": "Error: Issue not found"
}
```

### **Access Denied - No Category Access**
**HTTP Status**: `500 Internal Server Error`
```json
{
  "success": false,
  "message": "Access denied: You are not authorized to manage this category in this zone",
  "error": "Error: Access denied: You are not authorized to manage this category in this zone"
}
```

### **Citizens Cannot Update Status**
**HTTP Status**: `500 Internal Server Error`
```json
{
  "success": false,
  "message": "Access denied: Citizens cannot update issue status",
  "error": "Error: Access denied: Citizens cannot update issue status"
}
```

### **Authentication Required**
**HTTP Status**: `401 Unauthorized`
```json
{
  "success": false,
  "message": "Access token required"
}
```

## 🔄 **Status Workflow Examples**

### **Typical Issue Lifecycle**
```
1. OPEN (Issue reported)
   ↓
2. ACKNOWLEDGED (Steward sees issue)
   ↓
3. IN_PROGRESS (Work starts)
   ↓
4. RESOLVED (Work completed)
```

### **Alternative Paths**
```
OPEN → RESOLVED (Quick fix)
OPEN → ARCHIVED (Duplicate/Invalid)
IN_PROGRESS → OPEN (Work paused)
RESOLVED → IN_PROGRESS (Issue reoccurred)
```

## 🎨 **Frontend Integration Examples**

### **React Component Example**
```jsx
import React, { useState } from 'react';

const IssueStatusUpdater = ({ issueId, currentStatus, token }) => {
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const updateStatus = async () => {
    setLoading(true);
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
      
      if (result.success) {
        alert('Status updated successfully!');
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      alert('Network error: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="status-updater">
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="OPEN">Open</option>
        <option value="ACKNOWLEDGED">Acknowledged</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="RESOLVED">Resolved</option>
        <option value="ARCHIVED">Archived</option>
      </select>
      
      <textarea
        placeholder="Reason for status change..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
      />
      
      <button onClick={updateStatus} disabled={loading}>
        {loading ? 'Updating...' : 'Update Status'}
      </button>
    </div>
  );
};
```

### **Status Badge Component**
```jsx
const StatusBadge = ({ status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#ff6b6b';
      case 'ACKNOWLEDGED': return '#feca57';
      case 'IN_PROGRESS': return '#48dbfb';
      case 'RESOLVED': return '#0be881';
      case 'ARCHIVED': return '#a4b0be';
      default: return '#778ca3';
    }
  };

  return (
    <span 
      className="status-badge"
      style={{ 
        backgroundColor: getStatusColor(status),
        padding: '4px 8px',
        borderRadius: '4px',
        color: 'white',
        fontSize: '12px'
      }}
    >
      {status}
    </span>
  );
};
```

## 📊 **Business Logic Features**

### **Automatic Features**
1. **Timestamp Updates**: `updated_at` is automatically set
2. **Resolution Tracking**: `resolved_at` is set when status becomes `RESOLVED`
3. **Reputation Rewards**: +10 reputation awarded to issue reporter on resolution
4. **History Logging**: All changes recorded in `issue_history` table
5. **Permission Validation**: Automatic category/zone access checking

### **Smart Validations**
1. **UUID Validation**: Issue ID must be valid UUID
2. **Status Validation**: Only allowed status values accepted
3. **Text Length**: Reason field limited to 500 characters
4. **Authority Check**: Stewards can only update their assigned categories

## 🔧 **Testing the API**

### **Test with Valid Token**
```bash
# Get auth token first
curl -X POST \
  "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "steward1@naagrik.com",
    "password": "password123"
  }'

# Use the token to update status
curl -X PUT \
  "http://localhost:5000/api/issues/47675200-731e-4332-84ff-3b0fef8dd8b3/status" \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ACKNOWLEDGED",
    "reason": "Issue reviewed and prioritized"
  }'
```

## 🚀 **Quick Start Guide**

1. **Login as Steward**:
   ```bash
   POST /api/auth/login
   { "email": "steward1@naagrik.com", "password": "password123" }
   ```

2. **Get Your Issues**:
   ```bash
   GET /api/stewards/issues/me
   ```

3. **Update Issue Status**:
   ```bash
   PUT /api/issues/{issueId}/status
   { "status": "IN_PROGRESS", "reason": "Work started" }
   ```

4. **Mark as Resolved**:
   ```bash
   PUT /api/issues/{issueId}/status
   { "status": "RESOLVED", "reason": "Issue fixed successfully" }
   ```

This API is production-ready with comprehensive validation, security, and audit trail features!
