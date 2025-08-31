const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const seedCategories = async () => {
  console.log('🗂️ Seeding issue categories...');
  
  const categories = [
    { name: 'Road Infrastructure', description: 'Road repairs, potholes, traffic signals' },
    { name: 'Water Supply', description: 'Water shortage, pipe leaks, quality issues' },
    { name: 'Electricity', description: 'Power outages, street lighting, electrical hazards' },
    { name: 'Sanitation', description: 'Garbage collection, drainage, cleanliness' },
    { name: 'Public Safety', description: 'Crime, security concerns, emergency services' },
    { name: 'Transportation', description: 'Public transport, parking, traffic management' },
    { name: 'Environment', description: 'Pollution, tree cutting, noise complaints' },
    { name: 'Healthcare', description: 'Public health services, medical facilities' },
    { name: 'Education', description: 'Schools, educational infrastructure' },
    { name: 'Housing', description: 'Housing development, building safety' },
    { name: 'Other', description: 'Other civic issues not covered above' }
  ];

  for (const category of categories) {
    await query(
      'INSERT INTO issue_categories (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
      [category.name, category.description]
    );
  }
  
  console.log('✅ Issue categories seeded');
};

const seedBadges = async () => {
  console.log('🏆 Seeding badges...');
  
  const badges = [
    { name: 'New Reporter', description: 'Reported your first issue', required_score: 0 },
    { name: 'Active Citizen', description: 'Earned 50 reputation points', required_score: 50 },
    { name: 'Community Helper', description: 'Earned 100 reputation points', required_score: 100 },
    { name: 'Civic Champion', description: 'Earned 250 reputation points', required_score: 250 },
    { name: 'Change Maker', description: 'Earned 500 reputation points', required_score: 500 },
    { name: 'Community Leader', description: 'Earned 1000 reputation points', required_score: 1000 },
    { name: 'Civic Hero', description: 'Earned 2500 reputation points', required_score: 2500 },
    { name: 'Super Citizen', description: 'Earned 5000 reputation points', required_score: 5000 }
  ];

  for (const badge of badges) {
    await query(
      'INSERT INTO badges (name, description, required_score) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
      [badge.name, badge.description, badge.required_score]
    );
  }
  
  console.log('✅ Badges seeded');
};

const seedAdminZones = async () => {
  console.log('🗺️ Seeding admin zones...');
  
  const zones = [
    { name: 'Central District', description: 'Central business and administrative area' },
    { name: 'North District', description: 'Northern residential and commercial area' },
    { name: 'South District', description: 'Southern industrial and residential area' },
    { name: 'East District', description: 'Eastern suburban area' },
    { name: 'West District', description: 'Western commercial and residential area' }
  ];

  for (const zone of zones) {
    await query(
      'INSERT INTO admin_zones (name, description) VALUES ($1, $2)',
      [zone.name, zone.description]
    );
  }
  
  console.log('✅ Admin zones seeded');
};

const seedSuperAdmin = async () => {
  console.log('👑 Creating super admin user...');
  
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  await query(
    `INSERT INTO users (
      email, password_hash, full_name, phone_number, role, reputation_score,
      address_line1, city, state, pincode, country, is_verified, is_active,
      occupation, organization, preferred_language
    ) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
     ON CONFLICT (email) DO NOTHING`,
    [
      'admin@naagrik.com', hashedPassword, 'Super Admin', '9876543210', 'SUPER_ADMIN', 10000,
      'IIT Kharagpur Campus', 'Kharagpur', 'West Bengal', '721302', 'India', true, true,
      'System Administrator', 'Naagrik Platform', 'en'
    ]
  );
  
  console.log('✅ Super admin created (email: admin@naagrik.com, password: admin123)');
};

const seedDemoUsers = async () => {
  console.log('👥 Creating demo users...');
  
  const demoUsers = [
    { 
      email: 'citizen1@example.com', 
      name: 'Rajesh Kumar', 
      phone: '9876543201',
      role: 'CITIZEN', 
      reputation: 150,
      address: 'Technology Student Gymnasium, IIT Kharagpur',
      occupation: 'Student',
      organization: 'IIT Kharagpur',
      bio: 'Final year Computer Science student at IIT Kharagpur. Active in campus civic issues.',
      gender: 'Male'
    },
    { 
      email: 'citizen2@example.com', 
      name: 'Priya Sharma', 
      phone: '9876543202',
      role: 'CITIZEN', 
      reputation: 280,
      address: 'Nehru Avenue, Kharagpur',
      occupation: 'Teacher',
      organization: 'Government High School',
      bio: 'Passionate about community development and civic engagement.',
      gender: 'Female'
    },
    { 
      email: 'steward1@example.com', 
      name: 'Amit Singh', 
      phone: '9876543203',
      role: 'STEWARD', 
      reputation: 750,
      address: 'Vikramshila Complex, IIT Kharagpur',
      occupation: 'Municipal Engineer',
      organization: 'Kharagpur Municipality',
      bio: 'Experienced municipal engineer specializing in infrastructure and public works.',
      gender: 'Male'
    },
    { 
      email: 'steward2@example.com', 
      name: 'Sunita Patel', 
      phone: '9876543204',
      role: 'STEWARD', 
      reputation: 620,
      address: 'Market Complex, Kharagpur',
      occupation: 'Public Health Officer',
      organization: 'West Bengal Health Department',
      bio: 'Public health professional focused on sanitation and community health initiatives.',
      gender: 'Female'
    },
    { 
      email: 'citizen3@example.com', 
      name: 'Arjun Mehta', 
      phone: '9876543205',
      role: 'CITIZEN', 
      reputation: 95,
      address: 'Railway Colony, Kharagpur',
      occupation: 'Software Developer',
      organization: 'Tech Solutions Pvt Ltd',
      bio: 'Tech enthusiast working to make civic engagement more accessible through technology.',
      gender: 'Male'
    },
    { 
      email: 'citizen4@example.com', 
      name: 'Kavya Nair', 
      phone: '9876543206',
      role: 'CITIZEN', 
      reputation: 180,
      address: 'Scholars Avenue, IIT Kharagpur',
      occupation: 'Research Scholar',
      organization: 'IIT Kharagpur',
      bio: 'PhD researcher in Environmental Sciences with interest in sustainable urban development.',
      gender: 'Female'
    }
  ];

  for (const user of demoUsers) {
    const hashedPassword = await bcrypt.hash('demo123', 12);
    await query(
      `INSERT INTO users (
        email, password_hash, full_name, phone_number, role, reputation_score,
        address_line1, city, state, pincode, country, is_verified, is_active,
        occupation, organization, bio, gender, preferred_language,
        notification_preferences
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) 
       ON CONFLICT (email) DO NOTHING`,
      [
        user.email, hashedPassword, user.name, user.phone, user.role, user.reputation,
        user.address, 'Kharagpur', 'West Bengal', '721302', 'India', true, true,
        user.occupation, user.organization, user.bio, user.gender, 'en',
        '{"email": true, "sms": false, "push": true}'
      ]
    );
  }
  
  console.log('✅ Demo users created (password: demo123)');
};

const seedDemoIssues = async () => {
  console.log('📋 Creating demo issues...');
  
  // Get user IDs
  const usersResult = await query('SELECT id, email FROM users WHERE role = $1 LIMIT 2', ['CITIZEN']);
  const users = usersResult.rows;
  
  if (users.length === 0) {
    console.log('⚠️ No citizen users found, skipping demo issues');
    return;
  }

  // Get category IDs
  const categoriesResult = await query('SELECT id, name FROM issue_categories LIMIT 5');
  const categories = categoriesResult.rows;

  const demoIssues = [
    {
      title: 'Large pothole on Main Street',
      description: 'There is a large pothole on Main Street near the intersection with Oak Avenue. It has been causing damage to vehicles and creating traffic hazards.',
      category: 'Road Infrastructure',
      lat: 28.6139,
      lng: 77.2090,
      address: 'Main Street, Central District'
    },
    {
      title: 'Street light not working',
      description: 'The street light at the corner of Pine Street and 2nd Avenue has not been working for over a week, making the area unsafe at night.',
      category: 'Electricity',
      lat: 28.6149,
      lng: 77.2100,
      address: 'Pine Street & 2nd Avenue'
    },
    {
      title: 'Garbage not collected for 3 days',
      description: 'Garbage has not been collected in our residential area for the past 3 days. The bins are overflowing and creating hygiene issues.',
      category: 'Sanitation',
      lat: 28.6129,
      lng: 77.2080,
      address: 'Residential Complex, Block A'
    },
    {
      title: 'Water leakage from main pipe',
      description: 'There is a significant water leakage from the main water supply pipe on Elm Street. Water is being wasted and the road is getting damaged.',
      category: 'Water Supply',
      lat: 28.6159,
      lng: 77.2110,
      address: 'Elm Street, near bus stop'
    }
  ];

  for (let i = 0; i < demoIssues.length; i++) {
    const issue = demoIssues[i];
    const user = users[i % users.length];
    const category = categories.find(c => c.name === issue.category) || categories[0];
    
    await query(
      `INSERT INTO issues (user_id, category_id, title, description, location_lat, location_lng, address) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, category.id, issue.title, issue.description, issue.lat, issue.lng, issue.address]
    );
  }
  
  console.log('✅ Demo issues created');
};

async function runSeed() {
  try {
    console.log('🌱 Starting database seeding...');
    
    await seedCategories();
    await seedBadges();
    await seedAdminZones();
    await seedSuperAdmin();
    await seedDemoUsers();
    await seedDemoIssues();
    
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

module.exports = { runSeed };
