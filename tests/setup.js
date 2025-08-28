const { query } = require('../config/database');

// Test setup and teardown utilities
require('dotenv').config({ path: '.env.test' });
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Mock Cloudinary for tests
jest.mock('../utils/cloudinary', () => require('./mocks/cloudinary'));

const setupTestDatabase = async () => {
  // Create test data that can be used across tests
  console.log('🧪 Setting up test database...');
  
  // Ensure we have test categories
  await query(`
    INSERT INTO issue_categories (name, description) 
    VALUES ('Test Category', 'Category for testing')
    ON CONFLICT (name) DO NOTHING
  `);
  
  console.log('✅ Test database setup complete');
};

const cleanupTestDatabase = async () => {
  console.log('🧹 Cleaning up test database...');
  
  // Clean up test data in correct order (respecting foreign key constraints)
  await query('DELETE FROM steward_notes WHERE note LIKE \'%TEST%\' OR steward_id IN (SELECT id FROM users WHERE email LIKE \'%test%\')');
  await query('DELETE FROM steward_applications WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%test%\') OR reviewed_by IN (SELECT id FROM users WHERE email LIKE \'%test%\')');
  await query('DELETE FROM comments WHERE content LIKE \'%TEST%\'');
  await query('DELETE FROM issue_votes WHERE issue_id IN (SELECT id FROM issues WHERE title LIKE \'%TEST%\')');
  await query('DELETE FROM issues WHERE title LIKE \'%TEST%\'');
  await query('DELETE FROM users WHERE email LIKE \'%test%\'');
  
  console.log('✅ Test database cleanup complete');
};

const createTestUser = async (email = 'test@example.com', role = 'CITIZEN') => {
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const result = await query(
    'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING *',
    [email, hashedPassword, 'Test User', role]
  );
  
  return result.rows[0];
};

const createTestIssue = async (userId, categoryId = 1) => {
  const result = await query(
    `INSERT INTO issues (user_id, category_id, title, description, location_lat, location_lng, address) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      userId,
      categoryId,
      'TEST: Sample Issue',
      'This is a test issue description',
      12.9716,
      77.5946,
      'Bangalore, India'
    ]
  );
  
  return result.rows[0];
};

const generateJWT = (user) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  createTestIssue,
  generateJWT
};
