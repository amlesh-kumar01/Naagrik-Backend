const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test data - these match the seeded users
const testCredentials = {
  admin: { email: 'admin@naagrik.com', password: 'password123' },
  steward1: { email: 'steward1@naagrik.com', password: 'password123' },
  steward2: { email: 'steward2@naagrik.com', password: 'password123' },
  citizen1: { email: 'citizen1@student.iitkgp.ac.in', password: 'password123' }
};

let tokens = {};
let testData = {};

const testEndpoints = async () => {
  try {
    console.log('🚀 Starting API endpoint tests...\n');
    
    // 1. Test Authentication
    await testAuthentication();
    
    // 2. Test Zone Management
    await testZoneManagement();
    
    // 3. Test Issue Management
    await testIssueManagement();
    
    // 4. Test Steward Management
    await testStewardManagement();
    
    // 5. Test Dashboard and Stats
    await testDashboard();
    
    console.log('\n✅ All API endpoint tests completed successfully!');
    
  } catch (error) {
    console.error('❌ API endpoint tests failed:', error);
    throw error;
  }
};

const testAuthentication = async () => {
  console.log('🔐 Testing Authentication endpoints...');
  
  try {
    // Test login for each user type
    for (const [role, credentials] of Object.entries(testCredentials)) {
      const response = await axios.post(`${BASE_URL}/auth/login`, credentials);
      tokens[role] = response.data.data.token;
      testData[`${role}User`] = response.data.data.user;
      console.log(`✓ Login successful for ${role}: ${response.data.data.user.full_name}`);
    }
    
    // Test profile endpoint
    const profileResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    console.log(`✓ Profile fetch successful: ${profileResponse.data.data.user.full_name}`);
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error.response?.data || error.message);
    throw error;
  }
};

const testZoneManagement = async () => {
  console.log('\n🏢 Testing Zone Management endpoints...');
  
  try {
    // Test public zone endpoints (no auth required)
    const availableZonesResponse = await axios.get(`${BASE_URL}/api/zones/public/available`);
    console.log(`✓ Available zones fetched: ${availableZonesResponse.data.data?.length || 0} zones found`);
    
    // Test zone search (no auth required)  
    const searchResponse = await axios.get(`${BASE_URL}/api/zones/public/search?query=IIT`);
    console.log(`✓ Zone search successful: ${searchResponse.data.data?.length || 0} zones found`);
    
    // Test admin zone endpoints (requires admin auth)
    const adminZonesResponse = await axios.get(`${BASE_URL}/api/zones`, {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    testData.zones = adminZonesResponse.data.data;
    console.log(`✓ Admin zones fetched: ${adminZonesResponse.data.data.length} zones found`);
    
  } catch (error) {
    console.error('❌ Zone management test failed:', error.response?.data || error.message);
    throw error;
  }
};

const testIssueManagement = async () => {
  console.log('\n🚨 Testing Issue Management endpoints...');
  
  try {
    // Test get all issues
    const allIssuesResponse = await axios.get(`${BASE_URL}/issues`);
    testData.issues = allIssuesResponse.data.data.issues;
    console.log(`✓ Get all issues successful: Found ${testData.issues.length} issues`);
    
    // Test create new issue
    const newIssueData = {
      title: 'Test API Issue',
      description: 'This is a test issue created via API endpoint testing',
      categoryId: testData.categories[0].id,
      zoneId: testData.zones[0].id,
      locationLat: 22.3149,
      locationLng: 87.3105,
      address: 'Test Location, IIT Kharagpur'
    };
    
    const createIssueResponse = await axios.post(`${BASE_URL}/issues`, newIssueData, {
      headers: { Authorization: `Bearer ${tokens.citizen1}` }
    });
    testData.newIssue = createIssueResponse.data.data.issue;
    console.log(`✓ Create issue successful: ${testData.newIssue.title}`);
    
    // Test get specific issue
    const issueResponse = await axios.get(`${BASE_URL}/issues/${testData.newIssue.id}`);
    console.log(`✓ Get specific issue successful: ${issueResponse.data.data.issue.title}`);
    
    // Test vote on issue
    const voteResponse = await axios.post(`${BASE_URL}/issues/${testData.newIssue.id}/vote`, 
      { voteType: 1 }, 
      { headers: { Authorization: `Bearer ${tokens.citizen1}` } }
    );
    console.log(`✓ Vote on issue successful: Vote recorded`);
    
  } catch (error) {
    console.error('❌ Issue management test failed:', error.response?.data || error.message);
    throw error;
  }
};

const testStewardManagement = async () => {
  console.log('\n👨‍💼 Testing Steward Management endpoints...');
  
  try {
    // Test get steward categories
    const stewardCategoriesResponse = await axios.get(`${BASE_URL}/stewards/categories/me`, {
      headers: { Authorization: `Bearer ${tokens.steward1}` }
    });
    console.log(`✓ Get steward categories successful: ${stewardCategoriesResponse.data.data.categories.length} categories`);
    
    // Test get steward issues
    const stewardIssuesResponse = await axios.get(`${BASE_URL}/stewards/issues/me`, {
      headers: { Authorization: `Bearer ${tokens.steward1}` }
    });
    console.log(`✓ Get steward issues successful: ${stewardIssuesResponse.data.data.issues.length} issues`);
    
    // Test update issue status (if steward has permission)
    if (testData.issues.length > 0) {
      const issueToUpdate = testData.issues.find(issue => 
        issue.status === 'OPEN' || issue.status === 'ACKNOWLEDGED'
      );
      
      if (issueToUpdate) {
        try {
          const updateStatusResponse = await axios.put(
            `${BASE_URL}/issues/${issueToUpdate.id}/status`,
            { status: 'IN_PROGRESS', reason: 'Starting to work on this issue' },
            { headers: { Authorization: `Bearer ${tokens.steward1}` } }
          );
          console.log(`✓ Update issue status successful: ${updateStatusResponse.data.message}`);
        } catch (statusError) {
          console.log(`ℹ️  Update issue status: ${statusError.response?.data?.error || 'Permission denied (expected)'}`);
        }
      }
    }
    
    // Test admin assign steward to category
    const assignResponse = await axios.post(`${BASE_URL}/stewards/assignments/category`, {
      stewardId: testData.steward1User.id,
      categoryId: testData.categories[0].id,
      zoneId: testData.zones[0].id,
      notes: 'API test assignment'
    }, {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    console.log(`✓ Assign steward to category successful: ${assignResponse.data.message}`);
    
  } catch (error) {
    console.error('❌ Steward management test failed:', error.response?.data || error.message);
    throw error;
  }
};

const testDashboard = async () => {
  console.log('\n📊 Testing Dashboard endpoints...');
  
  try {
    // Test get dashboard stats (admin)
    const adminDashboardResponse = await axios.get(`${BASE_URL}/dashboard/admin`, {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    console.log(`✓ Admin dashboard successful: ${JSON.stringify(adminDashboardResponse.data.data, null, 2)}`);
    
    // Test get steward dashboard
    const stewardDashboardResponse = await axios.get(`${BASE_URL}/dashboard/steward`, {
      headers: { Authorization: `Bearer ${tokens.steward1}` }
    });
    console.log(`✓ Steward dashboard successful: Stats retrieved`);
    
    // Test get citizen dashboard
    const citizenDashboardResponse = await axios.get(`${BASE_URL}/dashboard/citizen`, {
      headers: { Authorization: `Bearer ${tokens.citizen1}` }
    });
    console.log(`✓ Citizen dashboard successful: Stats retrieved`);
    
  } catch (error) {
    console.error('❌ Dashboard test failed:', error.response?.data || error.message);
    throw error;
  }
};

// Helper function to make requests with better error handling
const makeRequest = async (method, url, data = null, headers = {}) => {
  try {
    const config = { method, url: `${BASE_URL}${url}`, headers };
    if (data) config.data = data;
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Request failed: ${method.toUpperCase()} ${url}`);
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
};

// Run tests if called directly
if (require.main === module) {
  testEndpoints()
    .then(() => {
      console.log('\n🎉 All API tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 API tests failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testEndpoints };
