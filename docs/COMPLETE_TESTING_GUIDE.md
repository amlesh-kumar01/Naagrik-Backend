# Naagrik API Testing Guide
## Comprehensive Testing Documentation for New Zone Selection System

### Overview
This guide provides complete testing scenarios, sample requests, and expected responses for the Naagrik API after the migration to zone selection and category-based steward management.

---

## 🧪 Testing Environment Setup

### Prerequisites
```bash
# 1. Start the server
npm start

# 2. Verify database is seeded
node scripts/comprehensiveSeed.js

# 3. Install testing dependencies
npm install axios --save-dev
```

### Test Data Overview
The seeded database contains:
- **9 Users**: 1 Admin, 3 Stewards, 5 Citizens
- **8 Zones**: IIT Kharagpur area zones
- **10 Categories**: Infrastructure, Environment, Safety, etc.
- **8 Issues**: Realistic issues with votes and comments
- **10 Steward Assignments**: Category-zone combinations

---

## 🔐 Authentication Testing

### Test User Credentials
```javascript
const testUsers = {
  admin: {
    email: 'admin@naagrik.com',
    password: 'password123',
    expectedRole: 'ADMIN'
  },
  steward1: {
    email: 'steward1@naagrik.com', 
    password: 'password123',
    expectedRole: 'STEWARD'
  },
  steward2: {
    email: 'steward2@naagrik.com',
    password: 'password123', 
    expectedRole: 'STEWARD'
  },
  citizen1: {
    email: 'citizen1@student.iitkgp.ac.in',
    password: 'password123',
    expectedRole: 'CITIZEN'
  }
};
```

### Authentication Test Scenarios

#### 1. User Registration Test
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "password": "password123",
    "fullName": "Test User",
    "phoneNumber": "+91-9876543210",
    "address": "Test Address",
    "occupation": "Tester",
    "organization": "Test Org",
    "dateOfBirth": "1995-06-15",
    "gender": "other",
    "preferences": {
      "emailNotifications": true,
      "smsNotifications": false
    }
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "newuser@test.com",
      "fullName": "Test User",
      "role": "CITIZEN"
    },
    "token": "jwt_token"
  }
}
```

#### 2. User Login Test
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@naagrik.com",
    "password": "password123"
  }'
```

#### 3. Profile Access Test
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <admin_token>"
```

---

## 🏢 Zone Management Testing

### Public Zone Endpoints (No Auth Required)

#### 1. Get Available Zones
```bash
curl -X GET http://localhost:5000/api/zones/public/available
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "zones": [
      {
        "id": "uuid",
        "areaName": "IIT Kharagpur Main Campus",
        "state": "West Bengal",
        "district": "West Midnapore", 
        "pincode": "721302"
      },
      {
        "id": "uuid",
        "areaName": "Technology Village",
        "state": "West Bengal",
        "district": "West Midnapore",
        "pincode": "721302"
      }
    ]
  }
}
```

#### 2. Search Zones
```bash
curl -X GET "http://localhost:5000/api/zones/public/search?q=kharagpur"
```

#### 3. Get Categories
```bash
curl -X GET http://localhost:5000/api/zones/categories
```

### Admin Zone Management (Requires Admin Token)

#### 1. Create New Zone
```bash
curl -X POST http://localhost:5000/api/zones \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "areaName": "New Test Area",
    "state": "West Bengal",
    "district": "Test District",
    "pincode": "123456"
  }'
```

#### 2. Get All Zones (Admin)
```bash
curl -X GET http://localhost:5000/api/zones \
  -H "Authorization: Bearer <admin_token>"
```

---

## 🚨 Issue Management Testing

### Public Issue Endpoints

#### 1. Get All Issues
```bash
curl -X GET http://localhost:5000/api/issues
```

#### 2. Get Issues with Filters
```bash
curl -X GET "http://localhost:5000/api/issues?category=uuid&zone=uuid&status=OPEN&page=1&limit=10"
```

#### 3. Get Specific Issue
```bash
curl -X GET http://localhost:5000/api/issues/<issue_uuid>
```

### Authenticated Issue Endpoints

#### 1. Create New Issue (Citizen)
```bash
curl -X POST http://localhost:5000/api/issues \
  -H "Authorization: Bearer <citizen_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Test Issue - Broken Infrastructure",
    "description": "This is a comprehensive test issue created via API to validate the new zone selection system. The issue involves broken infrastructure that needs immediate attention from the relevant steward.",
    "categoryId": "<infrastructure_category_uuid>",
    "zoneId": "<zone_uuid>",
    "priority": "HIGH",
    "locationLat": 22.3149,
    "locationLng": 87.3105,
    "address": "Test Location, Main Road, IIT Kharagpur"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Issue created successfully",
  "data": {
    "issue": {
      "id": "uuid",
      "title": "API Test Issue - Broken Infrastructure",
      "status": "OPEN",
      "priority": "HIGH",
      "category": {
        "name": "Infrastructure"
      },
      "zone": {
        "areaName": "IIT Kharagpur Main Campus"
      },
      "creator": {
        "fullName": "Test User"
      },
      "createdAt": "2025-08-31T12:00:00.000Z"
    }
  }
}
```

#### 2. Vote on Issue
```bash
curl -X POST http://localhost:5000/api/issues/<issue_uuid>/vote \
  -H "Authorization: Bearer <citizen_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "voteType": 1
  }'
```

#### 3. Find Similar Issues
```bash
curl -X POST http://localhost:5000/api/issues/find-similar \
  -H "Authorization: Bearer <citizen_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Street light problem", 
    "description": "Street light is not working properly",
    "categoryId": "<infrastructure_uuid>",
    "zoneId": "<zone_uuid>"
  }'
```

#### 4. Get My Issues
```bash
curl -X GET http://localhost:5000/api/issues/my/issues \
  -H "Authorization: Bearer <citizen_token>"
```

### Steward Issue Management

#### 1. Update Issue Status (Steward)
```bash
curl -X PUT http://localhost:5000/api/issues/<issue_uuid>/status \
  -H "Authorization: Bearer <steward_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS",
    "reason": "Starting investigation and planning repair work"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Issue status updated successfully",
  "data": {
    "issue": {
      "id": "uuid",
      "status": "IN_PROGRESS",
      "statusHistory": [
        {
          "status": "IN_PROGRESS",
          "reason": "Starting investigation and planning repair work",
          "changedBy": "Steward Name",
          "changedAt": "2025-08-31T12:30:00.000Z"
        }
      ]
    }
  }
}
```

---

## 👨‍💼 Steward Management Testing

### Steward Application Process

#### 1. Submit Application (Citizen)
```bash
curl -X POST http://localhost:5000/api/stewards/applications \
  -H "Authorization: Bearer <citizen_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "motivation": "I am passionate about improving our community and have extensive experience in managing civic issues. I want to contribute to making our area better for everyone.",
    "experience": "I have 3 years of experience in community management and have previously worked with local government on infrastructure projects.",
    "categories": ["<infrastructure_uuid>", "<environment_uuid>"],
    "zones": ["<zone1_uuid>", "<zone2_uuid>"]
  }'
```

#### 2. Review Application (Admin)
```bash
curl -X PUT http://localhost:5000/api/stewards/applications/<application_uuid>/review \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "reviewNotes": "Excellent motivation and relevant experience. Approved for steward role."
  }'
```

### Steward Category Management

#### 1. Get Steward Categories
```bash
curl -X GET http://localhost:5000/api/stewards/categories/me \
  -H "Authorization: Bearer <steward_token>"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "uuid",
        "name": "Infrastructure",
        "zone": {
          "id": "uuid",
          "areaName": "IIT Kharagpur Main Campus",
          "pincode": "721302"
        },
        "assignedAt": "2025-08-31T12:00:00.000Z",
        "assignedBy": "Admin Name"
      }
    ]
  }
}
```

#### 2. Get Steward Issues
```bash
curl -X GET http://localhost:5000/api/stewards/issues/me \
  -H "Authorization: Bearer <steward_token>"
```

#### 3. Assign Steward to Category (Admin)
```bash
curl -X POST http://localhost:5000/api/stewards/assignments/category \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "stewardId": "<steward_uuid>",
    "categoryId": "<category_uuid>",
    "zoneId": "<zone_uuid>",
    "notes": "Assigned due to expertise in this category"
  }'
```

---

## 💬 Comment System Testing

#### 1. Add Comment to Issue
```bash
curl -X POST http://localhost:5000/api/comments/issues/<issue_uuid>/comments \
  -H "Authorization: Bearer <citizen_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I have also noticed this issue. It has been problematic for the past week."
  }'
```

#### 2. Get Issue Comments
```bash
curl -X GET http://localhost:5000/api/comments/issues/<issue_uuid>/comments
```

#### 3. Reply to Comment (Nested)
```bash
curl -X POST http://localhost:5000/api/comments/issues/<issue_uuid>/comments \
  -H "Authorization: Bearer <steward_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Thank you for reporting. We are working on this issue.",
    "parentId": "<parent_comment_uuid>"
  }'
```

---

## 📊 Dashboard Testing

### Admin Dashboard
```bash
curl -X GET http://localhost:5000/api/dashboard/admin \
  -H "Authorization: Bearer <admin_token>"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 9,
    "totalIssues": 8,
    "totalStewards": 3,
    "totalZones": 8,
    "issuesByStatus": {
      "OPEN": 3,
      "ACKNOWLEDGED": 2,
      "IN_PROGRESS": 1,
      "RESOLVED": 2
    },
    "issuesByCategory": {
      "Infrastructure": 3,
      "Environment": 2,
      "Safety": 1,
      "Healthcare": 1,
      "Education": 1
    },
    "issuesByZone": {
      "IIT Kharagpur Main Campus": 3,
      "Technology Village": 2,
      "Hijli Station Area": 1
    }
  }
}
```

### Steward Dashboard
```bash
curl -X GET http://localhost:5000/api/dashboard/steward \
  -H "Authorization: Bearer <steward_token>"
```

### Citizen Dashboard
```bash
curl -X GET http://localhost:5000/api/dashboard/citizen \
  -H "Authorization: Bearer <citizen_token>"
```

---

## 📁 File Upload Testing

### Single Image Upload
```bash
curl -X POST http://localhost:5000/api/upload/single \
  -H "Authorization: Bearer <citizen_token>" \
  -F "file=@test-image.jpg"
```

### Add Media to Issue
```bash
curl -X POST http://localhost:5000/api/issues/<issue_uuid>/media \
  -H "Authorization: Bearer <citizen_token>" \
  -F "file=@evidence.jpg" \
  -F "caption=Evidence photo"
```

---

## 🧪 Complete Test Script

### JavaScript Testing Script
```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authTokens = {};

const runCompleteTests = async () => {
  console.log('🚀 Starting Complete API Tests\n');
  
  try {
    // 1. Authentication Tests
    await testAuthentication();
    
    // 2. Zone Management Tests  
    await testZoneManagement();
    
    // 3. Issue Management Tests
    await testIssueManagement();
    
    // 4. Steward Management Tests
    await testStewardManagement();
    
    // 5. Comment System Tests
    await testCommentSystem();
    
    // 6. Dashboard Tests
    await testDashboards();
    
    // 7. Advanced Feature Tests
    await testAdvancedFeatures();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
};

const testAuthentication = async () => {
  console.log('🔐 Testing Authentication...');
  
  // Test login for each user type
  const users = [
    { email: 'admin@naagrik.com', password: 'password123', role: 'admin' },
    { email: 'steward1@naagrik.com', password: 'password123', role: 'steward1' },
    { email: 'citizen1@student.iitkgp.ac.in', password: 'password123', role: 'citizen1' }
  ];
  
  for (const user of users) {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: user.email,
      password: user.password
    });
    
    authTokens[user.role] = response.data.data.token;
    console.log(`✓ Login successful for ${user.role}: ${response.data.data.user.fullName}`);
  }
  
  // Test profile access
  const profileResponse = await axios.get(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${authTokens.citizen1}` }
  });
  console.log(`✓ Profile access successful: ${profileResponse.data.data.user.fullName}`);
};

const testZoneManagement = async () => {
  console.log('\n🏢 Testing Zone Management...');
  
  // Test public zone access
  const zonesResponse = await axios.get(`${BASE_URL}/zones/public/available`);
  console.log(`✓ Public zones access: ${zonesResponse.data.data.zones.length} zones found`);
  
  // Test categories
  const categoriesResponse = await axios.get(`${BASE_URL}/zones/categories`);
  console.log(`✓ Categories access: ${categoriesResponse.data.data.categories.length} categories found`);
  
  // Test admin zone management
  const adminZonesResponse = await axios.get(`${BASE_URL}/zones`, {
    headers: { Authorization: `Bearer ${authTokens.admin}` }
  });
  console.log(`✓ Admin zones access: ${adminZonesResponse.data.data.zones.length} zones`);
};

const testIssueManagement = async () => {
  console.log('\n🚨 Testing Issue Management...');
  
  // Test get all issues
  const issuesResponse = await axios.get(`${BASE_URL}/issues`);
  const issues = issuesResponse.data.data.issues;
  console.log(`✓ Get all issues: ${issues.length} issues found`);
  
  // Get zones and categories for creating test issue
  const zonesResponse = await axios.get(`${BASE_URL}/zones/public/available`);
  const categoriesResponse = await axios.get(`${BASE_URL}/zones/categories`);
  
  if (zonesResponse.data.data.zones.length > 0 && categoriesResponse.data.data.categories.length > 0) {
    // Test create issue
    const newIssueResponse = await axios.post(`${BASE_URL}/issues`, {
      title: "API Test Issue - Infrastructure Problem",
      description: "This is a test issue created via API endpoint testing to validate the new zone selection system works correctly.",
      categoryId: categoriesResponse.data.data.categories[0].id,
      zoneId: zonesResponse.data.data.zones[0].id,
      priority: "HIGH",
      locationLat: 22.3149,
      locationLng: 87.3105,
      address: "API Test Location, IIT Kharagpur"
    }, {
      headers: { Authorization: `Bearer ${authTokens.citizen1}` }
    });
    
    const newIssue = newIssueResponse.data.data.issue;
    console.log(`✓ Create issue successful: ${newIssue.title}`);
    
    // Test vote on issue
    await axios.post(`${BASE_URL}/issues/${newIssue.id}/vote`, {
      voteType: 1
    }, {
      headers: { Authorization: `Bearer ${authTokens.citizen1}` }
    });
    console.log(`✓ Vote on issue successful`);
    
    // Test get vote status
    const voteStatusResponse = await axios.get(`${BASE_URL}/issues/${newIssue.id}/vote-status`, {
      headers: { Authorization: `Bearer ${authTokens.citizen1}` }
    });
    console.log(`✓ Get vote status: ${voteStatusResponse.data.data.hasVoted ? 'Has voted' : 'No vote'}`);
  }
  
  // Test my issues
  const myIssuesResponse = await axios.get(`${BASE_URL}/issues/my/issues`, {
    headers: { Authorization: `Bearer ${authTokens.citizen1}` }
  });
  console.log(`✓ Get my issues: ${myIssuesResponse.data.data.issues.length} issues`);
};

const testStewardManagement = async () => {
  console.log('\n👨‍💼 Testing Steward Management...');
  
  // Test get steward categories
  const categoriesResponse = await axios.get(`${BASE_URL}/stewards/categories/me`, {
    headers: { Authorization: `Bearer ${authTokens.steward1}` }
  });
  console.log(`✓ Get steward categories: ${categoriesResponse.data.data.categories.length} categories assigned`);
  
  // Test get steward issues
  const stewardIssuesResponse = await axios.get(`${BASE_URL}/stewards/issues/me`, {
    headers: { Authorization: `Bearer ${authTokens.steward1}` }
  });
  console.log(`✓ Get steward issues: ${stewardIssuesResponse.data.data.issues.length} issues assigned`);
  
  // Test steward workload
  const workloadResponse = await axios.get(`${BASE_URL}/stewards/workload`, {
    headers: { Authorization: `Bearer ${authTokens.steward1}` }
  });
  console.log(`✓ Get steward workload: Retrieved workload statistics`);
};

const testCommentSystem = async () => {
  console.log('\n💬 Testing Comment System...');
  
  // Get an existing issue to comment on
  const issuesResponse = await axios.get(`${BASE_URL}/issues`);
  const issues = issuesResponse.data.data.issues;
  
  if (issues.length > 0) {
    const testIssue = issues[0];
    
    // Test add comment
    const commentResponse = await axios.post(`${BASE_URL}/comments/issues/${testIssue.id}/comments`, {
      content: "This is a test comment added via API endpoint testing."
    }, {
      headers: { Authorization: `Bearer ${authTokens.citizen1}` }
    });
    console.log(`✓ Add comment successful: Comment added to issue`);
    
    // Test get comments
    const commentsResponse = await axios.get(`${BASE_URL}/comments/issues/${testIssue.id}/comments`);
    console.log(`✓ Get comments: ${commentsResponse.data.data.comments.length} comments found`);
  }
};

const testDashboards = async () => {
  console.log('\n📊 Testing Dashboards...');
  
  // Test admin dashboard
  const adminDashboardResponse = await axios.get(`${BASE_URL}/dashboard/admin`, {
    headers: { Authorization: `Bearer ${authTokens.admin}` }
  });
  console.log(`✓ Admin dashboard: ${adminDashboardResponse.data.data.totalUsers} users, ${adminDashboardResponse.data.data.totalIssues} issues`);
  
  // Test steward dashboard
  const stewardDashboardResponse = await axios.get(`${BASE_URL}/dashboard/steward`, {
    headers: { Authorization: `Bearer ${authTokens.steward1}` }
  });
  console.log(`✓ Steward dashboard: Retrieved steward statistics`);
  
  // Test citizen dashboard
  const citizenDashboardResponse = await axios.get(`${BASE_URL}/dashboard/citizen`, {
    headers: { Authorization: `Bearer ${authTokens.citizen1}` }
  });
  console.log(`✓ Citizen dashboard: Retrieved citizen statistics`);
};

const testAdvancedFeatures = async () => {
  console.log('\n🔍 Testing Advanced Features...');
  
  // Test advanced filtering
  const advancedFilterResponse = await axios.get(`${BASE_URL}/issues/filter/advanced?priority=recent&limit=5`);
  console.log(`✓ Advanced filtering: ${advancedFilterResponse.data.data.issues.length} issues returned`);
  
  // Test analytics
  const analyticsResponse = await axios.get(`${BASE_URL}/issues/analytics/statistics`);
  console.log(`✓ Issue analytics: Statistics retrieved`);
  
  // Test trending issues
  const trendingResponse = await axios.get(`${BASE_URL}/issues/analytics/trending`);
  console.log(`✓ Trending issues: ${trendingResponse.data.data.issues.length} trending issues`);
};

// Run tests
runCompleteTests();
```

---

## 🎯 Permission Testing Matrix

### Test Permission Scenarios

#### 1. Zone Selection Validation
```javascript
// Test: Citizen creates issue without selecting zone
// Expected: 400 Bad Request - Zone ID required

// Test: Citizen selects invalid zone
// Expected: 404 Not Found - Zone does not exist

// Test: Citizen selects valid zone
// Expected: 201 Created - Issue created successfully
```

#### 2. Steward Category Access
```javascript
// Test: Steward updates issue in assigned category-zone
// Expected: 200 OK - Status updated

// Test: Steward updates issue in non-assigned category
// Expected: 403 Forbidden - No permission for this category

// Test: Steward updates issue in assigned category but different zone
// Expected: 403 Forbidden - No permission for this zone
```

#### 3. Admin Override Testing
```javascript
// Test: Admin accesses any endpoint
// Expected: 200 OK - Full access granted

// Test: Admin assigns steward to category
// Expected: 201 Created - Assignment successful

// Test: Admin creates/updates/deletes zones
// Expected: Success - Full zone management access
```

---

## 📈 Performance Testing

### Load Testing Scenarios
```javascript
// 1. Concurrent issue creation
// Test 10 users creating issues simultaneously

// 2. Heavy filtering
// Test complex queries with multiple filters

// 3. Comment threading
// Test deep nested comment creation

// 4. Vote scaling
// Test rapid voting on popular issues

// 5. File upload stress
// Test multiple file uploads simultaneously
```

### Monitoring Endpoints
```bash
# Health check
curl http://localhost:5000/health

# Rate limit status (check headers)
curl -I http://localhost:5000/api/issues
```

---

## 🐛 Error Testing Scenarios

### Authentication Errors
```javascript
// Invalid token
Authorization: "Bearer invalid_token"
// Expected: 401 Unauthorized

// Expired token  
Authorization: "Bearer expired_token"
// Expected: 401 Unauthorized

// Missing token for protected endpoint
// Expected: 401 Unauthorized
```

### Validation Errors
```javascript
// Invalid UUID format
"categoryId": "not-a-uuid"
// Expected: 422 Unprocessable Entity

// Missing required fields
{ "title": "Short" }
// Expected: 422 Validation errors

// Invalid enum values
{ "status": "INVALID_STATUS" }
// Expected: 422 Invalid status value
```

### Permission Errors
```javascript
// Citizen accessing admin endpoint
// Expected: 403 Forbidden

// Steward accessing wrong category
// Expected: 403 No permission for this category

// Non-steward updating issue status
// Expected: 403 Insufficient permissions
```

### Business Logic Errors
```javascript
// Duplicate zone assignment
// Expected: 409 Conflict - Already assigned

// Invalid status transition
"RESOLVED" → "OPEN" (without proper reason)
// Expected: 400 Invalid status transition

// Self-voting on own issue
// Expected: 400 Cannot vote on own issue
```

---

## 📝 Testing Checklist

### Pre-Testing Setup
- [ ] Server running on port 5000
- [ ] Database migrated with new schema
- [ ] Comprehensive seed data loaded
- [ ] All dependencies installed

### Authentication Tests
- [ ] User registration with all fields
- [ ] User registration with minimal fields
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Profile access with valid token
- [ ] Profile access with invalid token
- [ ] Token refresh
- [ ] Logout functionality

### Zone Management Tests
- [ ] Get available zones (public)
- [ ] Search zones by query
- [ ] Get all categories
- [ ] Admin create zone
- [ ] Admin update zone
- [ ] Admin delete zone
- [ ] Admin get all zones

### Issue Management Tests
- [ ] Get all issues (public)
- [ ] Get issues with filters
- [ ] Get specific issue
- [ ] Create issue with zone selection
- [ ] Create issue without zone (should fail)
- [ ] Update issue status (steward in assigned category)
- [ ] Update issue status (steward in non-assigned category - should fail)
- [ ] Vote on issue
- [ ] Change vote on issue
- [ ] Remove vote from issue
- [ ] Get vote status
- [ ] Find similar issues
- [ ] Get user's issues

### Steward Management Tests
- [ ] Submit steward application
- [ ] Get application status
- [ ] Review application (admin)
- [ ] Get steward categories
- [ ] Get steward issues
- [ ] Get steward workload
- [ ] Assign steward to category (admin)
- [ ] Bulk assign steward (admin)
- [ ] Remove steward assignment (admin)

### Comment System Tests
- [ ] Add comment to issue
- [ ] Get issue comments
- [ ] Add nested reply
- [ ] Update own comment
- [ ] Delete own comment
- [ ] Flag inappropriate comment
- [ ] Get flagged comments (admin)

### Dashboard Tests
- [ ] Admin dashboard statistics
- [ ] Steward dashboard statistics  
- [ ] Citizen dashboard statistics

### File Upload Tests
- [ ] Single file upload
- [ ] Multiple file upload
- [ ] Add media to issue
- [ ] Update issue thumbnail
- [ ] Remove media from issue

### Error Handling Tests
- [ ] Invalid authentication
- [ ] Insufficient permissions
- [ ] Invalid input validation
- [ ] Resource not found
- [ ] Rate limiting
- [ ] Server errors

This testing guide ensures comprehensive validation of the new zone selection and category-based steward management system.
