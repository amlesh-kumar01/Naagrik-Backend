# Naagrik API Validation Documentation
## Complete Validation Rules & Error Handling

### Overview
This document details all validation rules, error messages, and data constraints for the Naagrik API endpoints.

---

## 🔐 Authentication Validation

### Registration Validation
```javascript
// Email validation
email: {
  required: true,
  format: "Valid email address",
  unique: true,
  maxLength: 255,
  example: "user@example.com"
}

// Password validation
password: {
  required: true,
  minLength: 6,
  maxLength: 128,
  pattern: "At least 6 characters",
  example: "password123"
}

// Full name validation
fullName: {
  required: true,
  minLength: 1,
  maxLength: 100,
  pattern: "Letters, spaces, hyphens, apostrophes only",
  example: "John Doe"
}

// Phone number validation (optional)
phoneNumber: {
  required: false,
  pattern: "Valid phone format (+country-number)",
  example: "+91-9876543210"
}

// Address validation (optional)
address: {
  required: false,
  maxLength: 300,
  example: "123 Main Street, City, State"
}

// Occupation validation (optional)
occupation: {
  required: false,
  maxLength: 100,
  example: "Software Engineer"
}

// Organization validation (optional)
organization: {
  required: false,
  maxLength: 100,
  example: "Tech Corporation"
}

// Date of birth validation (optional)
dateOfBirth: {
  required: false,
  format: "YYYY-MM-DD",
  constraint: "Must be at least 13 years old",
  example: "1990-01-15"
}

// Gender validation (optional)
gender: {
  required: false,
  enum: ["male", "female", "other"],
  example: "male"
}

// Preferences validation (optional)
preferences: {
  required: false,
  type: "object",
  properties: {
    emailNotifications: { type: "boolean", default: true },
    smsNotifications: { type: "boolean", default: false }
  },
  example: {
    "emailNotifications": true,
    "smsNotifications": false
  }
}
```

### Login Validation
```javascript
email: {
  required: true,
  format: "Valid email address",
  example: "user@example.com"
}

password: {
  required: true,
  minLength: 6,
  example: "password123"
}
```

---

## 🏢 Zone Management Validation

### Create Zone Validation
```javascript
areaName: {
  required: true,
  minLength: 1,
  maxLength: 100,
  pattern: "Alphanumeric with spaces, hyphens, apostrophes",
  example: "IIT Kharagpur Main Campus"
}

state: {
  required: true,
  minLength: 1,
  maxLength: 50,
  example: "West Bengal"
}

district: {
  required: false,
  maxLength: 50,
  example: "West Midnapore"
}

pincode: {
  required: true,
  length: 6,
  pattern: "Exactly 6 digits",
  example: "721302"
}
```

### Zone Search Validation
```javascript
search: {
  required: false,
  minLength: 2,
  maxLength: 100,
  example: "IIT Kharagpur"
}

q: {
  required: true,
  minLength: 2,
  maxLength: 100,
  example: "kharagpur"
}
```

---

## 🚨 Issue Management Validation

### Create Issue Validation
```javascript
title: {
  required: true,
  minLength: 5,
  maxLength: 200,
  pattern: "Descriptive title",
  example: "Broken street light on Main Road"
}

description: {
  required: true,
  minLength: 10,
  maxLength: 2000,
  example: "The street light near the main gate has been flickering for 3 days"
}

categoryId: {
  required: true,
  format: "Valid UUID",
  constraint: "Must exist in categories table",
  example: "550e8400-e29b-41d4-a716-446655440000"
}

zoneId: {
  required: true,
  format: "Valid UUID",
  constraint: "Must exist in zones table",
  example: "550e8400-e29b-41d4-a716-446655440001"
}

priority: {
  required: false,
  enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
  default: "MEDIUM",
  example: "HIGH"
}

locationLat: {
  required: true,
  type: "float",
  min: -90,
  max: 90,
  example: 22.3149
}

locationLng: {
  required: true,
  type: "float", 
  min: -180,
  max: 180,
  example: 87.3105
}

address: {
  required: true,
  minLength: 5,
  maxLength: 300,
  example: "Main Road, Near Gate 1, IIT Kharagpur"
}
```

### Update Issue Status Validation
```javascript
status: {
  required: true,
  enum: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "ARCHIVED", "DUPLICATE"],
  constraints: {
    "OPEN": ["ACKNOWLEDGED", "IN_PROGRESS", "DUPLICATE", "ARCHIVED"],
    "ACKNOWLEDGED": ["IN_PROGRESS", "RESOLVED", "DUPLICATE", "ARCHIVED"],
    "IN_PROGRESS": ["RESOLVED", "OPEN", "ARCHIVED"],
    "RESOLVED": ["ARCHIVED", "OPEN"],
    "ARCHIVED": ["OPEN"],
    "DUPLICATE": []
  }
}

reason: {
  required: false,
  maxLength: 500,
  example: "Starting investigation into this issue"
}
```

### Issue Filtering Validation
```javascript
// Basic filters
category: {
  required: false,
  format: "Valid UUID",
  example: "550e8400-e29b-41d4-a716-446655440000"
}

zone: {
  required: false,
  format: "Valid UUID",
  example: "550e8400-e29b-41d4-a716-446655440001"
}

status: {
  required: false,
  enum: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "ARCHIVED", "DUPLICATE"]
}

priority: {
  required: false,
  enum: ["LOW", "MEDIUM", "HIGH", "URGENT"]
}

// Pagination
page: {
  required: false,
  type: "integer",
  min: 1,
  default: 1,
  example: 1
}

limit: {
  required: false,
  type: "integer",
  min: 1,
  max: 100,
  default: 20,
  example: 20
}

// Sorting
sortBy: {
  required: false,
  enum: ["createdAt", "updatedAt", "votes", "priority", "title"],
  default: "createdAt"
}

sortOrder: {
  required: false,
  enum: ["asc", "desc"],
  default: "desc"
}

// Advanced filters
categories[]: {
  required: false,
  type: "array",
  items: "Valid UUID",
  example: ["uuid1", "uuid2"]
}

zones[]: {
  required: false,
  type: "array", 
  items: "Valid UUID",
  example: ["uuid1", "uuid2"]
}

statuses[]: {
  required: false,
  type: "array",
  items: "Valid status enum",
  example: ["OPEN", "IN_PROGRESS"]
}

createdAfter: {
  required: false,
  format: "ISO 8601 date",
  example: "2025-08-01T00:00:00.000Z"
}

createdBefore: {
  required: false,
  format: "ISO 8601 date",
  example: "2025-08-31T23:59:59.999Z"
}

minVotes: {
  required: false,
  type: "integer",
  min: 0,
  example: 5
}

hasMedia: {
  required: false,
  type: "boolean",
  example: true
}
```

### Vote Validation
```javascript
voteType: {
  required: true,
  enum: [1, -1],
  description: "1 for upvote, -1 for downvote",
  example: 1
}
```

### Find Similar Issues Validation
```javascript
title: {
  required: true,
  minLength: 5,
  maxLength: 200,
  example: "Street light issue"
}

description: {
  required: true,
  minLength: 10,
  maxLength: 2000,
  example: "Detailed description of the issue"
}

categoryId: {
  required: true,
  format: "Valid UUID",
  example: "550e8400-e29b-41d4-a716-446655440000"
}

zoneId: {
  required: true,
  format: "Valid UUID",
  example: "550e8400-e29b-41d4-a716-446655440001"
}
```

---

## 👨‍💼 Steward Management Validation

### Steward Application Validation
```javascript
motivation: {
  required: true,
  minLength: 50,
  maxLength: 1000,
  example: "I want to help improve our community by managing civic issues effectively"
}

experience: {
  required: true,
  minLength: 20,
  maxLength: 1000,
  example: "I have 5 years experience in community management and civic issues"
}

categories: {
  required: true,
  type: "array",
  minItems: 1,
  maxItems: 5,
  items: "Valid UUID (category)",
  example: ["uuid1", "uuid2"]
}

zones: {
  required: true,
  type: "array",
  minItems: 1,
  maxItems: 3,
  items: "Valid UUID (zone)",
  example: ["uuid1", "uuid2"]
}
```

### Review Application Validation
```javascript
status: {
  required: true,
  enum: ["APPROVED", "REJECTED"],
  example: "APPROVED"
}

reviewNotes: {
  required: true,
  minLength: 10,
  maxLength: 500,
  example: "Application approved based on excellent motivation and experience"
}
```

### Assign Steward to Category Validation
```javascript
stewardId: {
  required: true,
  format: "Valid UUID",
  constraint: "Must be existing steward user",
  example: "550e8400-e29b-41d4-a716-446655440000"
}

categoryId: {
  required: true,
  format: "Valid UUID",
  constraint: "Must exist in categories table",
  example: "550e8400-e29b-41d4-a716-446655440001"
}

zoneId: {
  required: true,
  format: "Valid UUID",
  constraint: "Must exist in zones table",
  example: "550e8400-e29b-41d4-a716-446655440002"
}

notes: {
  required: false,
  maxLength: 300,
  example: "Assigned due to expertise in infrastructure issues"
}
```

### Bulk Assignment Validation
```javascript
stewardId: {
  required: true,
  format: "Valid UUID",
  example: "550e8400-e29b-41d4-a716-446655440000"
}

assignments: {
  required: true,
  type: "array",
  minItems: 1,
  maxItems: 10,
  items: {
    categoryId: "Valid UUID",
    zoneId: "Valid UUID"
  },
  example: [
    {
      "categoryId": "uuid1",
      "zoneId": "uuid2"
    }
  ]
}
```

---

## 💬 Comment Validation

### Create Comment Validation
```javascript
content: {
  required: true,
  minLength: 1,
  maxLength: 1000,
  pattern: "Text content with basic formatting",
  example: "This issue needs immediate attention"
}

parentId: {
  required: false,
  format: "Valid UUID (for nested comments)",
  constraint: "Must be existing comment ID",
  example: "550e8400-e29b-41d4-a716-446655440000"
}
```

### Update Comment Validation
```javascript
content: {
  required: true,
  minLength: 1,
  maxLength: 1000,
  example: "Updated comment content"
}
```

---

## 👤 User Management Validation

### Update Profile Validation
```javascript
fullName: {
  required: false,
  minLength: 1,
  maxLength: 100,
  pattern: "Letters, spaces, hyphens, apostrophes",
  example: "John Smith"
}

phoneNumber: {
  required: false,
  pattern: "Valid phone format",
  example: "+91-9876543210"
}

address: {
  required: false,
  maxLength: 300,
  example: "New address line"
}

occupation: {
  required: false,
  maxLength: 100,
  example: "Senior Developer"
}

organization: {
  required: false,
  maxLength: 100,
  example: "Technology Company"
}

preferences: {
  required: false,
  type: "object",
  properties: {
    emailNotifications: "boolean",
    smsNotifications: "boolean"
  }
}
```

### Update User Role Validation (Admin Only)
```javascript
role: {
  required: true,
  enum: ["CITIZEN", "STEWARD", "ADMIN"],
  constraint: "Cannot demote the last admin",
  example: "STEWARD"
}
```

---

## 🏆 Badge System Validation

### Create Badge Validation
```javascript
name: {
  required: true,
  minLength: 1,
  maxLength: 50,
  unique: true,
  example: "Community Helper"
}

description: {
  required: true,
  minLength: 10,
  maxLength: 200,
  example: "Awarded for helping the community"
}

criteria: {
  required: true,
  minLength: 10,
  maxLength: 500,
  example: "Report 5 valid issues that get resolved"
}

iconUrl: {
  required: false,
  format: "Valid URL",
  example: "https://example.com/badge-icon.png"
}

isActive: {
  required: false,
  type: "boolean",
  default: true,
  example: true
}
```

### Award Badge Validation
```javascript
userId: {
  required: true,
  format: "Valid UUID",
  constraint: "Must be existing user",
  example: "550e8400-e29b-41d4-a716-446655440000"
}

badgeId: {
  required: true,
  format: "Valid UUID",
  constraint: "Must be existing active badge",
  example: "550e8400-e29b-41d4-a716-446655440001"
}

reason: {
  required: true,
  minLength: 10,
  maxLength: 200,
  example: "Completed 5 successful issue reports"
}
```

---

## 📁 File Upload Validation

### Single File Upload
```javascript
file: {
  required: true,
  mimeTypes: [
    "image/jpeg",
    "image/png", 
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "application/pdf"
  ],
  maxSize: "10MB",
  constraints: {
    images: "Max dimensions 4096x4096",
    videos: "Max duration 60 seconds"
  }
}
```

### Add Media to Issue Validation
```javascript
file: {
  required: true,
  mimeTypes: ["image/jpeg", "image/png", "image/gif", "video/mp4"],
  maxSize: "10MB"
}

issueId: {
  required: true,
  format: "Valid UUID",
  constraint: "Must be existing issue, user must be creator or steward"
}

caption: {
  required: false,
  maxLength: 200,
  example: "Additional evidence photo"
}
```

---

## 🔍 Advanced Filtering Validation

### Location Filter Validation
```javascript
lat: {
  required: true,
  type: "float",
  min: -90,
  max: 90,
  example: 22.3149
}

lng: {
  required: true,
  type: "float",
  min: -180,
  max: 180,
  example: 87.3105
}

radius: {
  required: false,
  type: "integer",
  min: 100,
  max: 50000,
  default: 1000,
  unit: "meters",
  example: 2000
}
```

### Advanced Filter Validation
```javascript
priority: {
  required: false,
  enum: ["recent", "votes", "urgent", "oldest"],
  example: "votes"
}

limit: {
  required: false,
  type: "integer",
  min: 1,
  max: 100,
  default: 20,
  example: 50
}

offset: {
  required: false,
  type: "integer",
  min: 0,
  default: 0,
  example: 20
}
```

---

## ❌ Error Response Formats

### Validation Error Response (422)
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "field1": "Error message for field1",
    "field2": "Error message for field2"
  }
}
```

### Authentication Error Response (401)
```json
{
  "success": false,
  "error": "Authentication required",
  "message": "Please provide a valid token"
}
```

### Authorization Error Response (403)
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "message": "You don't have permission to perform this action"
}
```

### Not Found Error Response (404)
```json
{
  "success": false,
  "error": "Resource not found",
  "message": "The requested resource was not found"
}
```

### Conflict Error Response (409)
```json
{
  "success": false,
  "error": "Resource conflict",
  "message": "Email already exists"
}
```

### Rate Limit Error Response (429)
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 900
}
```

---

## 🔄 Business Logic Validation

### Issue Creation Business Rules
1. **Zone Selection Required**: User must select a zone from available options
2. **Category Assignment**: Issue must be assigned to a valid category
3. **Location Validation**: Coordinates must be reasonable for the selected zone
4. **Duplicate Prevention**: System checks for similar issues in same zone/category
5. **User Permissions**: Only authenticated users can create issues

### Steward Assignment Business Rules
1. **Category-Zone Combination**: Each assignment is specific to category within a zone
2. **No Duplicate Assignments**: Same steward cannot be assigned to same category-zone twice
3. **Active Steward Only**: Only users with STEWARD role can be assigned
4. **Zone Existence**: Zone must exist and be active
5. **Category Existence**: Category must exist and be active

### Issue Status Update Business Rules
1. **Permission Check**: Only assigned stewards or admins can update status
2. **Valid Transitions**: Status changes must follow allowed transition rules
3. **Reason Required**: Some status changes require explanatory reason
4. **Notification Trigger**: Status updates trigger notifications to relevant users

### Vote Management Business Rules
1. **One Vote Per User**: Users can only vote once per issue
2. **Vote Change Allowed**: Users can change their vote (upvote ↔ downvote)
3. **Vote Removal**: Users can remove their vote entirely
4. **Self-Vote Prevention**: Users cannot vote on their own issues

### Comment Management Business Rules
1. **Nested Comments**: Support for threaded discussions
2. **Edit Permissions**: Users can only edit their own comments (within time limit)
3. **Delete Permissions**: Users can delete own comments, admins can delete any
4. **Flagging System**: Community moderation through comment flagging

---

## 📊 Data Constraints

### Database Constraints
```sql
-- Users table constraints
CONSTRAINT users_email_unique UNIQUE (email)
CONSTRAINT users_role_check CHECK (role IN ('CITIZEN', 'STEWARD', 'ADMIN'))
CONSTRAINT users_gender_check CHECK (gender IN ('male', 'female', 'other'))

-- Issues table constraints  
CONSTRAINT issues_status_check CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED', 'DUPLICATE'))
CONSTRAINT issues_priority_check CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))
CONSTRAINT issues_location_lat_check CHECK (location_lat >= -90 AND location_lat <= 90)
CONSTRAINT issues_location_lng_check CHECK (location_lng >= -180 AND location_lng <= 180)

-- Zones table constraints
CONSTRAINT zones_pincode_check CHECK (pincode ~ '^[0-9]{6}$')

-- Votes table constraints
CONSTRAINT votes_type_check CHECK (vote_type IN (1, -1))
CONSTRAINT votes_user_issue_unique UNIQUE (user_id, issue_id)

-- Steward categories constraints
CONSTRAINT steward_categories_unique UNIQUE (steward_id, category_id, zone_id)
```

### File Upload Constraints
```javascript
// Image constraints
images: {
  maxWidth: 4096,
  maxHeight: 4096,
  maxSize: "10MB",
  formats: ["JPEG", "PNG", "GIF", "WebP"]
}

// Video constraints
videos: {
  maxDuration: 60, // seconds
  maxSize: "10MB", 
  formats: ["MP4", "QuickTime"]
}

// Document constraints
documents: {
  maxSize: "5MB",
  formats: ["PDF"]
}
```

---

## 🎯 Validation Examples

### Valid Issue Creation Request
```json
{
  "title": "Broken street light causing safety concerns",
  "description": "The street light on Main Road near the library has been flickering for the past week. This is causing safety issues for students walking at night. The light needs immediate repair or replacement.",
  "categoryId": "550e8400-e29b-41d4-a716-446655440000",
  "zoneId": "550e8400-e29b-41d4-a716-446655440001", 
  "priority": "HIGH",
  "locationLat": 22.3149,
  "locationLng": 87.3105,
  "address": "Main Road, Near Central Library, IIT Kharagpur"
}
```

### Invalid Issue Creation Request & Error
```json
// Request
{
  "title": "Bad",
  "description": "Short",
  "categoryId": "invalid-uuid",
  "locationLat": 95,
  "locationLng": 200
}

// Response (422)
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "title": "Title must be between 5 and 200 characters",
    "description": "Description must be between 10 and 2000 characters", 
    "categoryId": "Category ID must be a valid UUID",
    "zoneId": "Zone ID is required",
    "locationLat": "Latitude must be between -90 and 90",
    "locationLng": "Longitude must be between -180 and 180",
    "address": "Address is required"
  }
}
```

### Valid Steward Assignment Request
```json
{
  "stewardId": "550e8400-e29b-41d4-a716-446655440000",
  "categoryId": "550e8400-e29b-41d4-a716-446655440001",
  "zoneId": "550e8400-e29b-41d4-a716-446655440002",
  "notes": "Assigned to infrastructure category for IIT campus area due to civil engineering background"
}
```

---

## 🚀 Performance Considerations

### Pagination Limits
- Default page size: 20 items
- Maximum page size: 100 items
- Recommended page size for mobile: 10-20 items
- Recommended page size for desktop: 20-50 items

### Search Optimization
- Text search uses database indexes
- Location search uses spatial indexing
- Category/zone filters use foreign key indexes
- Full-text search available for title/description

### Caching Strategy
- Zone and category data cached for 1 hour
- Issue statistics cached for 15 minutes  
- User sessions cached in Redis
- Rate limiting data stored in Redis

This validation documentation ensures data integrity and provides clear guidelines for API consumers.
