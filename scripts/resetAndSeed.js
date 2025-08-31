const { query, transaction } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const resetAndSeed = async () => {
  try {
    console.log('🔄 Starting database reset and seeding...');
    
    // Drop all tables in correct order (reverse of creation order)
    await dropAllTables();
    
    // Create extensions
    await createExtensions();
    
    // Create enums
    await createEnums();
    
    // Create tables
    await createTables();
    
    // Insert seed data
    await seedData();
    
    console.log('✅ Database reset and seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Database reset and seeding failed:', error);
    throw error;
  }
};

const dropAllTables = async () => {
  console.log('🗑️ Dropping all tables...');
  
  const dropQueries = [
    'DROP TABLE IF EXISTS issue_votes CASCADE',
    'DROP TABLE IF EXISTS comment_flags CASCADE', 
    'DROP TABLE IF EXISTS steward_notes CASCADE',
    'DROP TABLE IF EXISTS issue_history CASCADE',
    'DROP TABLE IF EXISTS issue_media CASCADE',
    'DROP TABLE IF EXISTS comments CASCADE',
    'DROP TABLE IF EXISTS issues CASCADE',
    'DROP TABLE IF EXISTS user_badges CASCADE',
    'DROP TABLE IF EXISTS badges CASCADE',
    'DROP TABLE IF EXISTS steward_zone_assignments CASCADE',
    'DROP TABLE IF EXISTS steward_applications CASCADE',
    'DROP TABLE IF EXISTS issue_categories CASCADE',
    'DROP TABLE IF EXISTS users CASCADE',
    
    // Drop enums
    'DROP TYPE IF EXISTS user_role CASCADE',
    'DROP TYPE IF EXISTS issue_status CASCADE',
    'DROP TYPE IF EXISTS application_status CASCADE', 
    'DROP TYPE IF EXISTS media_type CASCADE',
    'DROP TYPE IF EXISTS moderation_status CASCADE'
  ];
  
  for (const dropQuery of dropQueries) {
    await query(dropQuery);
  }
  
  console.log('✅ All tables dropped');
};

const createExtensions = async () => {
  console.log('🔧 Creating extensions...');
  
  await query(`
    -- Enable necessary extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS postgis;
  `);
  
  console.log('✅ Extensions created');
};

const createEnums = async () => {
  console.log('📝 Creating enums...');
  
  const enumQueries = [
    "CREATE TYPE user_role AS ENUM ('CITIZEN', 'STEWARD', 'SUPER_ADMIN')",
    "CREATE TYPE issue_status AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED', 'DUPLICATE')",
    "CREATE TYPE application_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED')",
    "CREATE TYPE media_type AS ENUM ('IMAGE', 'VIDEO')",
    "CREATE TYPE moderation_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED')"
  ];
  
  for (const enumQuery of enumQueries) {
    await query(enumQuery);
  }
  
  console.log('✅ Enums created');
};

const createTables = async () => {
  console.log('🏗️ Creating tables...');
  
  // Users table
  await query(`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      role user_role DEFAULT 'CITIZEN',
      reputation_score INTEGER DEFAULT 0,
      location_lat DECIMAL(10,8),
      location_lng DECIMAL(11,8),
      address TEXT,
      profile_picture_url VARCHAR(500),
      is_verified BOOLEAN DEFAULT false,
      verification_token VARCHAR(255),
      reset_password_token VARCHAR(255),
      reset_password_expires TIMESTAMP,
      last_login TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Issue categories table
  await query(`
    CREATE TABLE issue_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      icon_url VARCHAR(500),
      color_code VARCHAR(7) DEFAULT '#007bff',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Issues table
  await query(`
    CREATE TABLE issues (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES issue_categories(id),
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      status issue_status DEFAULT 'OPEN',
      priority_level VARCHAR(20) DEFAULT 'medium',
      location_lat DECIMAL(10,8) NOT NULL,
      location_lng DECIMAL(11,8) NOT NULL,
      address TEXT,
      vote_score INTEGER DEFAULT 0,
      is_anonymous BOOLEAN DEFAULT false,
      is_urgent BOOLEAN DEFAULT false,
      primary_issue_id UUID REFERENCES issues(id),
      resolved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Comments table with nested support
  await query(`
    CREATE TABLE comments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_anonymous BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Issue media table
  await query(`
    CREATE TABLE issue_media (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      media_url VARCHAR(500) NOT NULL,
      media_type media_type NOT NULL,
      file_size INTEGER,
      file_name VARCHAR(255),
      is_thumbnail BOOLEAN DEFAULT false,
      moderation_status moderation_status DEFAULT 'APPROVED',
      ai_tags TEXT[],
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Issue votes table
  await query(`
    CREATE TABLE issue_votes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(issue_id, user_id)
    )
  `);
  
  // Issue history table
  await query(`
    CREATE TABLE issue_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      old_status issue_status NOT NULL,
      new_status issue_status NOT NULL,
      change_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Comment flags table
  await query(`
    CREATE TABLE comment_flags (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason VARCHAR(100) NOT NULL,
      additional_info TEXT,
      status moderation_status DEFAULT 'PENDING',
      reviewed_by UUID REFERENCES users(id),
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Steward applications table
  await query(`
    CREATE TABLE steward_applications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_text TEXT NOT NULL,
      experience_years INTEGER,
      preferred_areas TEXT[],
      status application_status DEFAULT 'PENDING',
      reviewed_by UUID REFERENCES users(id),
      reviewed_at TIMESTAMP,
      rejection_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Steward zone assignments table with proper geometry
  await query(`
    CREATE TABLE steward_zone_assignments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      zone_name VARCHAR(255) NOT NULL,
      zone_boundaries GEOMETRY(POLYGON, 4326),
      center_lat DECIMAL(10,8) NOT NULL,
      center_lng DECIMAL(11,8) NOT NULL,
      radius_km DECIMAL(8,3) DEFAULT 2.0,
      assigned_by UUID REFERENCES users(id),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Badges table
  await query(`
    CREATE TABLE badges (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      icon_url VARCHAR(500),
      criteria TEXT NOT NULL,
      points_required INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // User badges table
  await query(`
    CREATE TABLE user_badges (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
      earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, badge_id)
    )
  `);
  
  // Steward notes table
  await query(`
    CREATE TABLE steward_notes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      steward_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      note TEXT NOT NULL,
      is_public BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes for performance
  await query(`
    CREATE INDEX idx_issues_location ON issues USING GIST(ST_Point(location_lng, location_lat));
    CREATE INDEX idx_issues_status ON issues(status);
    CREATE INDEX idx_issues_category ON issues(category_id);
    CREATE INDEX idx_issues_user ON issues(user_id);
    CREATE INDEX idx_issue_votes_issue ON issue_votes(issue_id);
    CREATE INDEX idx_comments_issue ON comments(issue_id);
    CREATE INDEX idx_steward_zones_location ON steward_zone_assignments USING GIST(zone_boundaries);
  `);
  
  console.log('✅ Tables and indexes created');
};

const seedData = async () => {
  console.log('🌱 Seeding data...');
  
  await transaction(async (client) => {
    // Seed users
    const users = await seedUsers(client);
    
    // Seed categories
    const categories = await seedCategories(client);
    
    // Seed badges
    const badges = await seedBadges(client);
    
    // Seed steward zones BEFORE issues
    await seedStewardZones(client, users);
    
    // Seed issues (around IIT Kharagpur area)
    const issues = await seedIssues(client, users, categories);
    
    // Seed comments
    await seedComments(client, users, issues);
    
    // Seed votes
    await seedVotes(client, users, issues);
    
    // Seed issue history
    await seedIssueHistory(client, users, issues);
    
    // Seed user badges
    await seedUserBadges(client, users, badges);
    
    // Seed steward notes
    await seedStewardNotes(client, users, issues);
    
    console.log('✅ Data seeding completed');
    
    // Seed images after all other data is complete
    console.log('📸 Starting image seeding...');
    try {
      const { runImageSeeding } = require('./seedImages');
      const useRealImages = process.env.CLOUDINARY_CLOUD_NAME ? true : false;
      console.log(`🖼️ Image seeding mode: ${useRealImages ? 'Real images via Cloudinary' : 'Placeholder images'}`);
      
      const mediaCount = await runImageSeeding(useRealImages);
      console.log(`✅ Image seeding completed: ${mediaCount} media files added`);
    } catch (imageError) {
      console.error('⚠️ Image seeding failed, but continuing:', imageError.message);
      console.log('📝 Issues will be created without media files');
    }
  });
};

const seedUsers = async (client) => {
  console.log('👤 Seeding users around IIT Kharagpur...');
  
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const users = [
    {
      id: uuidv4(),
      email: 'admin@naagrik.com',
      full_name: 'System Administrator',
      role: 'SUPER_ADMIN',
      reputation_score: 1000,
      location_lat: 22.3149,
      location_lng: 87.3105,
      address: 'IIT Kharagpur Campus, West Bengal, India',
      is_verified: true
    },
    {
      id: uuidv4(),
      email: 'steward1@naagrik.com',
      full_name: 'Rajesh Kumar Singh',
      role: 'STEWARD',
      reputation_score: 500,
      location_lat: 22.3149,
      location_lng: 87.3105,
      address: 'Technology Market, Kharagpur',
      is_verified: true,
      phone: '+91-9876543210'
    },
    {
      id: uuidv4(),
      email: 'steward2@naagrik.com',
      full_name: 'Priya Sharma',
      role: 'STEWARD',
      reputation_score: 450,
      location_lat: 22.3200,
      location_lng: 87.3150,
      address: 'Kharagpur Railway Station Area',
      is_verified: true,
      phone: '+91-9876543211'
    },
    {
      id: uuidv4(),
      email: 'steward3@naagrik.com',
      full_name: 'Debasis Mondal',
      role: 'STEWARD',
      reputation_score: 380,
      location_lat: 22.3120,
      location_lng: 87.3080,
      address: 'Hijli Cooperative Area',
      is_verified: true,
      phone: '+91-9876543212'
    },
    {
      id: uuidv4(),
      email: 'amit.student@iitkgp.ac.in',
      full_name: 'Amit Singh',
      role: 'CITIZEN',
      reputation_score: 150,
      location_lat: 22.3180,
      location_lng: 87.3120,
      address: 'Azad Hall, IIT Kharagpur',
      phone: '+91-8765432109'
    },
    {
      id: uuidv4(),
      email: 'sneha.research@iitkgp.ac.in',
      full_name: 'Sneha Das',
      role: 'CITIZEN',
      reputation_score: 120,
      location_lat: 22.3160,
      location_lng: 87.3140,
      address: 'New Academic Complex, IIT Kharagpur',
      phone: '+91-8765432108'
    },
    {
      id: uuidv4(),
      email: 'ravi.faculty@iitkgp.ac.in',
      full_name: 'Dr. Ravi Patel',
      role: 'CITIZEN',
      reputation_score: 200,
      location_lat: 22.3170,
      location_lng: 87.3080,
      address: 'Faculty Quarters, IIT Kharagpur',
      phone: '+91-8765432107'
    },
    {
      id: uuidv4(),
      email: 'kavitha.phd@iitkgp.ac.in',
      full_name: 'Kavitha Reddy',
      role: 'CITIZEN',
      reputation_score: 80,
      location_lat: 22.3190,
      location_lng: 87.3160,
      address: 'Graduate Hostel, IIT Kharagpur',
      phone: '+91-8765432106'
    },
    {
      id: uuidv4(),
      email: 'arjun.btech@iitkgp.ac.in',
      full_name: 'Arjun Mishra',
      role: 'CITIZEN',
      reputation_score: 95,
      location_lat: 22.3155,
      location_lng: 87.3110,
      address: 'Patel Hall, IIT Kharagpur',
      phone: '+91-8765432105'
    },
    {
      id: uuidv4(),
      email: 'deepika.mtech@iitkgp.ac.in',
      full_name: 'Deepika Joshi',
      role: 'CITIZEN',
      reputation_score: 110,
      location_lat: 22.3165,
      location_lng: 87.3125,
      address: 'Nehru Hall, IIT Kharagpur',
      phone: '+91-8765432104'
    },
    {
      id: uuidv4(),
      email: 'suresh.local@kharagpur.com',
      full_name: 'Suresh Mahato',
      role: 'CITIZEN',
      reputation_score: 140,
      location_lat: 22.3210,
      location_lng: 87.3100,
      address: 'Gole Bazaar, Kharagpur',
      phone: '+91-8765432103'
    },
    {
      id: uuidv4(),
      email: 'maya.shopkeeper@kharagpur.com',
      full_name: 'Maya Devi',
      role: 'CITIZEN',
      reputation_score: 75,
      location_lat: 22.3195,
      location_lng: 87.3115,
      address: 'Market Area, Kharagpur',
      phone: '+91-8765432102'
    },
    {
      id: uuidv4(),
      email: 'ramesh.auto@kharagpur.com',
      full_name: 'Ramesh Yadav',
      role: 'CITIZEN',
      reputation_score: 60,
      location_lat: 22.3175,
      location_lng: 87.3135,
      address: 'Auto Stand, Kharagpur',
      phone: '+91-8765432101'
    }
  ];
  
  for (const user of users) {
    await client.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, reputation_score, 
       location_lat, location_lng, address, is_verified, phone, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() - INTERVAL '${Math.floor(Math.random() * 180)} days')`,
      [user.id, user.email, passwordHash, user.full_name, user.role, 
       user.reputation_score, user.location_lat, user.location_lng, 
       user.address, user.is_verified || false, user.phone || null]
    );
  }
  
  console.log(`✅ Created ${users.length} users`);
  return users;
};

const seedCategories = async (client) => {
  console.log('📂 Seeding issue categories...');
  
  const categories = [
    {
      name: 'Roads & Transportation',
      description: 'Potholes, broken roads, traffic issues, parking problems',
      color_code: '#ff6b35',
      icon_url: '/icons/road.svg'
    },
    {
      name: 'Water & Sewerage',
      description: 'Water supply issues, drainage problems, sewerage blockage',
      color_code: '#1e90ff',
      icon_url: '/icons/water.svg'
    },
    {
      name: 'Electricity',
      description: 'Power outages, street light issues, electrical problems',
      color_code: '#ffd700',
      icon_url: '/icons/electricity.svg'
    },
    {
      name: 'Waste Management',
      description: 'Garbage collection, littering, waste disposal issues',
      color_code: '#32cd32',
      icon_url: '/icons/waste.svg'
    },
    {
      name: 'Public Safety',
      description: 'Security concerns, unsafe areas, emergency services',
      color_code: '#dc143c',
      icon_url: '/icons/safety.svg'
    },
    {
      name: 'Infrastructure',
      description: 'Building maintenance, public facilities, construction issues',
      color_code: '#8a2be2',
      icon_url: '/icons/infrastructure.svg'
    },
    {
      name: 'Environment',
      description: 'Pollution, noise complaints, environmental hazards',
      color_code: '#228b22',
      icon_url: '/icons/environment.svg'
    },
    {
      name: 'Healthcare',
      description: 'Medical facilities, health services, sanitation',
      color_code: '#ff1493',
      icon_url: '/icons/healthcare.svg'
    }
  ];
  
  const insertedCategories = [];
  for (const category of categories) {
    const result = await client.query(
      'INSERT INTO issue_categories (name, description, color_code, icon_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [category.name, category.description, category.color_code, category.icon_url]
    );
    insertedCategories.push(result.rows[0]);
  }
  
  console.log(`✅ Created ${insertedCategories.length} categories`);
  return insertedCategories;
};

const seedStewardZones = async (client, users) => {
  console.log('🗺️ Seeding steward zone assignments...');
  
  const stewards = users.filter(u => u.role === 'STEWARD');
  const admin = users.find(u => u.role === 'SUPER_ADMIN');
  
  // Define zones around IIT Kharagpur
  const zones = [
    {
      steward_id: stewards[0].id, // Rajesh Kumar Singh
      zone_name: 'IIT Campus & Technology Market Zone',
      center_lat: 22.3149,
      center_lng: 87.3105,
      radius_km: 1.5,
      description: 'Covers IIT main campus, Technology Market, and immediate surrounding areas'
    },
    {
      steward_id: stewards[1].id, // Priya Sharma
      zone_name: 'Railway Station & Medical College Zone',
      center_lat: 22.3190,
      center_lng: 87.3150,
      radius_km: 2.0,
      description: 'Covers Railway Station area, Medical College, and nearby residential areas'
    },
    {
      steward_id: stewards[2].id, // Debasis Mondal
      zone_name: 'Hijli & Southern Kharagpur Zone',
      center_lat: 22.3120,
      center_lng: 87.3080,
      radius_km: 2.5,
      description: 'Covers Hijli Cooperative area and southern parts of Kharagpur town'
    }
  ];
  
  for (const zone of zones) {
    // Create circular polygon for the zone (simplified)
    const polygon = `POLYGON((
      ${zone.center_lng - zone.radius_km/111} ${zone.center_lat - zone.radius_km/111},
      ${zone.center_lng + zone.radius_km/111} ${zone.center_lat - zone.radius_km/111},
      ${zone.center_lng + zone.radius_km/111} ${zone.center_lat + zone.radius_km/111},
      ${zone.center_lng - zone.radius_km/111} ${zone.center_lat + zone.radius_km/111},
      ${zone.center_lng - zone.radius_km/111} ${zone.center_lat - zone.radius_km/111}
    ))`;
    
    await client.query(`
      INSERT INTO steward_zone_assignments (
        id, user_id, zone_name, zone_boundaries, center_lat, center_lng, 
        radius_km, assigned_by, is_active, created_at
      ) VALUES ($1, $2, $3, ST_GeomFromText($4, 4326), $5, $6, $7, $8, true, NOW())
    `, [
      uuidv4(),
      zone.steward_id,
      zone.zone_name,
      polygon,
      zone.center_lat,
      zone.center_lng,
      zone.radius_km,
      admin.id
    ]);
  }
  
  console.log(`✅ Created ${zones.length} steward zones`);
  return zones;
};

const seedIssues = async (client, users, categories) => {
  console.log('🚨 Seeding issues around IIT Kharagpur...');
  
  // Get categories by name for easy reference
  const roadCategory = categories.find(c => c.name === 'Roads & Transportation');
  const waterCategory = categories.find(c => c.name === 'Water & Sewerage');
  const electricityCategory = categories.find(c => c.name === 'Electricity');
  const wasteCategory = categories.find(c => c.name === 'Waste Management');
  const safetyCategory = categories.find(c => c.name === 'Public Safety');
  const infraCategory = categories.find(c => c.name === 'Infrastructure');
  const envCategory = categories.find(c => c.name === 'Environment');
  const healthCategory = categories.find(c => c.name === 'Healthcare');
  
  // Citizens (non-admin, non-steward users)
  const citizens = users.filter(u => u.role === 'CITIZEN');
  
  const issues = [
    // Zone 1: IIT Campus & Technology Market (Steward: Rajesh Kumar Singh)
    {
      id: uuidv4(),
      user_id: citizens[0].id,
      category_id: roadCategory.id,
      title: 'Deep Pothole on Nehru Avenue Near IIT Main Gate',
      description: 'There is a very deep pothole on Nehru Avenue just 200 meters from IIT Kharagpur main gate. It has been causing problems for students and faculty riding bikes. During monsoon, it gets filled with water making it invisible and dangerous. Multiple accidents have already happened.',
      location_lat: 22.3145,
      location_lng: 87.3108,
      address: 'Nehru Avenue, near IIT Kharagpur Main Gate',
      vote_score: 45,
      is_urgent: true,
      status: 'ACKNOWLEDGED'
    },
    {
      id: uuidv4(),
      user_id: citizens[1].id,
      category_id: electricityCategory.id,
      title: 'Street Lights Not Working in Technology Market',
      description: 'Multiple street lights in the Technology Market area have been non-functional for over a week. This area sees heavy student traffic during evening hours for shopping and food. The darkness is making it unsafe, especially for female students.',
      location_lat: 22.3155,
      location_lng: 87.3095,
      address: 'Technology Market, Kharagpur',
      vote_score: 32,
      status: 'OPEN'
    },
    {
      id: uuidv4(),
      user_id: citizens[2].id,
      category_id: wasteCategory.id,
      title: 'Garbage Overflow Near Student Shopping Complex',
      description: 'The garbage bins near the main student shopping complex are constantly overflowing. Bad smell and unhygienic conditions are affecting both students and shopkeepers. Municipal collection seems irregular.',
      location_lat: 22.3162,
      location_lng: 87.3115,
      address: 'Student Shopping Complex, IIT Kharagpur',
      vote_score: 28,
      status: 'OPEN'
    },
    {
      id: uuidv4(),
      user_id: citizens[3].id,
      category_id: safetyCategory.id,
      title: 'Unsafe Pedestrian Crossing Near Main Gate',
      description: 'The pedestrian crossing near IIT main gate lacks proper signals and markings. Heavy traffic makes it dangerous for students. Multiple near-miss incidents have occurred.',
      location_lat: 22.3147,
      location_lng: 87.3107,
      address: 'IIT Kharagpur Main Gate Crossing',
      vote_score: 41,
      is_urgent: true,
      status: 'OPEN'
    },
    {
      id: uuidv4(),
      user_id: citizens[4].id,
      category_id: waterCategory.id,
      title: 'Water Supply Issues in Campus Residential Area',
      description: 'Irregular water supply in the campus residential areas. Water comes only for 2-3 hours daily, causing major inconvenience. Low pressure when available.',
      location_lat: 22.3158,
      location_lng: 87.3112,
      address: 'Residential Complex, IIT Kharagpur',
      vote_score: 31,
      status: 'ACKNOWLEDGED'
    },

    // Zone 2: Railway Station & Medical College (Steward: Priya Sharma)
    {
      id: uuidv4(),
      user_id: citizens[5].id,
      category_id: waterCategory.id,
      title: 'Severe Water Logging Near Medical College',
      description: 'Heavy waterlogging occurs near Kharagpur Medical College during even moderate rainfall. The drainage system seems completely blocked. Students and patients face severe inconvenience.',
      location_lat: 22.3195,
      location_lng: 87.3165,
      address: 'Near Medical College, Kharagpur',
      vote_score: 38,
      status: 'IN_PROGRESS'
    },
    {
      id: uuidv4(),
      user_id: citizens[6].id,
      category_id: roadCategory.id,
      title: 'Broken Road from IIT to Railway Station',
      description: 'The main road connecting IIT to Railway Station has multiple broken patches. Auto rickshaws struggle to navigate, leading to higher fares and passenger discomfort.',
      location_lat: 22.3175,
      location_lng: 87.3142,
      address: 'IIT to Railway Station Road',
      vote_score: 35,
      status: 'ACKNOWLEDGED'
    },
    {
      id: uuidv4(),
      user_id: citizens[7].id,
      category_id: infraCategory.id,
      title: 'Railway Station Platform Roof Leakage',
      description: 'The roof of Platform 2 at Kharagpur Railway Station has severe leakage issues. During rain, passengers get soaked while waiting for trains.',
      location_lat: 22.3198,
      location_lng: 87.3155,
      address: 'Kharagpur Railway Station, Platform 2',
      vote_score: 22,
      status: 'OPEN'
    },
    {
      id: uuidv4(),
      user_id: citizens[8].id,
      category_id: healthCategory.id,
      title: 'Insufficient Parking at Medical College',
      description: 'The medical college has insufficient parking space. Patients and visitors have to park very far away, causing difficulty for elderly and emergency cases.',
      location_lat: 22.3192,
      location_lng: 87.3168,
      address: 'Medical College Parking Area',
      vote_score: 19,
      status: 'OPEN'
    },

    // Zone 3: Hijli & Southern Kharagpur (Steward: Debasis Mondal)
    {
      id: uuidv4(),
      user_id: citizens[9].id,
      category_id: wasteCategory.id,
      title: 'Garbage Accumulation in Hijli Cooperative',
      description: 'Large amounts of garbage are accumulating in the Hijli Cooperative area. The municipal collection service seems to have stopped. Residents are facing serious hygiene issues.',
      location_lat: 22.3125,
      location_lng: 87.3085,
      address: 'Hijli Cooperative Society',
      vote_score: 25,
      status: 'OPEN'
    },
    {
      id: uuidv4(),
      user_id: citizens[10].id,
      category_id: electricityCategory.id,
      title: 'Frequent Power Cuts in Hijli Area',
      description: 'The Hijli residential area experiences frequent power cuts, especially during peak hours. Affecting daily life and small businesses in the area.',
      location_lat: 22.3118,
      location_lng: 87.3075,
      address: 'Hijli Residential Area',
      vote_score: 27,
      status: 'OPEN'
    },
    {
      id: uuidv4(),
      user_id: citizens[11].id,
      category_id: roadCategory.id,
      title: 'Narrow Road Causing Traffic Jams',
      description: 'The narrow road in southern Kharagpur causes severe traffic congestion during market hours. Commercial vehicles and autos struggle to pass.',
      location_lat: 22.3110,
      location_lng: 87.3090,
      address: 'Southern Kharagpur Market Road',
      vote_score: 18,
      status: 'OPEN'
    },

    // Some resolved issues for variety
    {
      id: uuidv4(),
      user_id: citizens[0].id,
      category_id: electricityCategory.id,
      title: 'Fixed: Street Light Near Main Library',
      description: 'Street light near the main library was restored after reporting. Thanks to quick action by campus maintenance.',
      location_lat: 22.3159,
      location_lng: 87.3119,
      address: 'Near Main Library, IIT Kharagpur',
      vote_score: 12,
      status: 'RESOLVED',
      resolved_at: 'NOW() - INTERVAL \'5 days\''
    },
    {
      id: uuidv4(),
      user_id: citizens[1].id,
      category_id: wasteCategory.id,
      title: 'Resolved: Improved Garbage Collection Schedule',
      description: 'Regular garbage collection restored in Technology Market after reporting. Municipal authorities assigned dedicated vehicles.',
      location_lat: 22.3157,
      location_lng: 87.3097,
      address: 'Technology Market, Kharagpur',
      vote_score: 18,
      status: 'RESOLVED',
      resolved_at: 'NOW() - INTERVAL \'3 days\''
    }
  ];
  
  for (const issue of issues) {
    const resolvedAtValue = issue.resolved_at ? issue.resolved_at : null;
    
    await client.query(
      `INSERT INTO issues (id, user_id, category_id, title, description, status, 
       location_lat, location_lng, address, vote_score, is_urgent, resolved_at, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL '${Math.floor(Math.random() * 45)} days')`,
      [issue.id, issue.user_id, issue.category_id, issue.title, issue.description, 
       issue.status, issue.location_lat, issue.location_lng, issue.address, 
       issue.vote_score, issue.is_urgent || false, resolvedAtValue]
    );
  }
  
  console.log(`✅ Created ${issues.length} issues with zone-based distribution`);
  return issues;
};

const seedBadges = async (client) => {
  console.log('🏆 Seeding badges...');
  
  const badges = [
    {
      name: 'First Reporter',
      description: 'Reported your first civic issue',
      criteria: 'Report 1 issue',
      points_required: 0,
      icon_url: '/icons/first-report.svg'
    },
    {
      name: 'Community Helper',
      description: 'Helped resolve 5 community issues',
      criteria: 'Get 5 issues resolved',
      points_required: 50,
      icon_url: '/icons/helper.svg'
    },
    {
      name: 'Trusted Citizen',
      description: 'Earned 100+ reputation points',
      criteria: 'Reach 100 reputation',
      points_required: 100,
      icon_url: '/icons/trusted.svg'
    },
    {
      name: 'Super Contributor',
      description: 'Top contributor with 500+ reputation',
      criteria: 'Reach 500 reputation',
      points_required: 500,
      icon_url: '/icons/super.svg'
    },
    {
      name: 'Photo Journalist',
      description: 'Added photos to 10 issues',
      criteria: 'Upload media to 10 issues',
      points_required: 75,
      icon_url: '/icons/camera.svg'
    },
    {
      name: 'Vote Master',
      description: 'Cast 50 helpful votes',
      criteria: 'Cast 50 votes',
      points_required: 25,
      icon_url: '/icons/vote.svg'
    }
  ];
  
  const insertedBadges = [];
  for (const badge of badges) {
    const result = await client.query(
      'INSERT INTO badges (name, description, criteria, points_required, icon_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [badge.name, badge.description, badge.criteria, badge.points_required, badge.icon_url]
    );
    insertedBadges.push(result.rows[0]);
  }
  
  console.log(`✅ Created ${insertedBadges.length} badges`);
  return insertedBadges;
};

const seedComments = async (client, users, issues) => {
  console.log('💬 Seeding comments...');
  
  const citizens = users.filter(u => u.role === 'CITIZEN');
  const stewards = users.filter(u => u.role === 'STEWARD');
  
  const commentTexts = [
    'I have also noticed this issue in my daily commute. It needs immediate attention.',
    'This is affecting many people in our locality. Hope the authorities resolve it soon.',
    'I can confirm this problem exists. It has been like this for several weeks now.',
    'Thank you for reporting this issue. I was planning to report the same thing.',
    'This is a serious safety concern that requires urgent action from authorities.',
    'Municipal authorities should prioritize this issue given its impact.',
    'I have also raised this concern with local representatives.',
    'Similar issues exist in nearby areas too. This seems to be a widespread problem.',
    'इस समस्या का जल्दी समाधान होना चाहिए।', // Hindi comment
    'এই সমস্যার দ্রুত সমাধান প্রয়োজন।' // Bengali comment
  ];
  
  const stewardComments = [
    'We have received this complaint and forwarded it to the relevant municipal authorities.',
    'This issue has been marked as high priority based on community feedback.',
    'I have personally inspected this location. Following up with the concerned department.',
    'Thank you for the detailed report with photo evidence. This helps us understand the severity.',
    'We are coordinating with multiple departments to resolve this issue comprehensively.',
    'Temporary measures have been discussed. Permanent solution is being planned.',
    'This issue falls under our zone responsibility. We will ensure proper follow-up.'
  ];
  
  let commentCount = 0;
  
  // Add comments to most issues
  for (const issue of issues) {
    const numComments = Math.floor(Math.random() * 4) + 1; // 1-4 comments per issue
    
    for (let i = 0; i < numComments; i++) {
      const isStewaard = Math.random() > 0.7; // 30% steward comments
      const randomUser = isStewaard ? 
        stewards[Math.floor(Math.random() * stewards.length)] :
        citizens[Math.floor(Math.random() * citizens.length)];
      
      // Skip if user is commenting on their own issue
      if (randomUser.id === issue.user_id) continue;
      
      const content = isStewaard ? 
        stewardComments[Math.floor(Math.random() * stewardComments.length)] :
        commentTexts[Math.floor(Math.random() * commentTexts.length)];
      
      await client.query(
        `INSERT INTO comments (id, issue_id, user_id, content, created_at) 
         VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days')`,
        [uuidv4(), issue.id, randomUser.id, content]
      );
      
      commentCount++;
      
      // 20% chance of nested reply
      if (Math.random() > 0.8 && i > 0) {
        const replyUser = citizens[Math.floor(Math.random() * citizens.length)];
        if (replyUser.id !== randomUser.id && replyUser.id !== issue.user_id) {
          const replyTexts = [
            'I agree with this comment completely.',
            'Thanks for the additional information.',
            'Same situation in my area as well.',
            'When can we expect this to be resolved?'
          ];
          
          // Get the last comment ID for this issue
          const lastCommentResult = await client.query(
            'SELECT id FROM comments WHERE issue_id = $1 ORDER BY created_at DESC LIMIT 1',
            [issue.id]
          );
          
          if (lastCommentResult.rows.length > 0) {
            await client.query(
              `INSERT INTO comments (id, issue_id, user_id, parent_comment_id, content, created_at) 
               VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${Math.floor(Math.random() * 25)} days')`,
              [uuidv4(), issue.id, replyUser.id, lastCommentResult.rows[0].id, 
               replyTexts[Math.floor(Math.random() * replyTexts.length)]]
            );
            commentCount++;
          }
        }
      }
    }
  }
  
  console.log(`✅ Created ${commentCount} comments with nested replies`);
};

const seedVotes = async (client, users, issues) => {
  console.log('🗳️ Seeding votes...');
  
  const citizens = users.filter(u => u.role === 'CITIZEN');
  let voteCount = 0;
  
  for (const issue of issues) {
    // Random number of votes per issue (more votes for urgent issues)
    const baseVoters = Math.floor(Math.random() * citizens.length * 0.6);
    const urgentBonus = issue.is_urgent ? Math.floor(citizens.length * 0.2) : 0;
    const numVoters = Math.min(baseVoters + urgentBonus, citizens.length - 1);
    
    const voters = citizens
      .filter(c => c.id !== issue.user_id) // Exclude issue creator
      .sort(() => 0.5 - Math.random())
      .slice(0, numVoters);
    
    for (const voter of voters) {
      // Realistic vote distribution: 75% upvotes, 25% downvotes
      // More upvotes for urgent issues
      const upvoteChance = issue.is_urgent ? 0.85 : 0.75;
      const voteType = Math.random() < upvoteChance ? 1 : -1;
      
      try {
        await client.query(
          `INSERT INTO issue_votes (id, issue_id, user_id, vote_type, created_at) 
           VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${Math.floor(Math.random() * 35)} days')`,
          [uuidv4(), issue.id, voter.id, voteType]
        );
        voteCount++;
      } catch (error) {
        // Skip duplicate votes
        if (!error.message.includes('duplicate key')) {
          console.error('Vote creation error:', error.message);
        }
      }
    }
  }
  
  // Update vote scores for all issues
  await client.query(`
    UPDATE issues 
    SET vote_score = (
      SELECT COALESCE(SUM(vote_type), 0) 
      FROM issue_votes 
      WHERE issue_id = issues.id
    )
  `);
  
  console.log(`✅ Created ${voteCount} votes`);
};

const seedIssueHistory = async (client, users, issues) => {
  console.log('📜 Seeding issue history...');
  
  const stewards = users.filter(u => u.role === 'STEWARD');
  let historyCount = 0;
  
  // Add history for issues that have been acknowledged, in progress, or resolved
  const issuesWithHistory = issues.filter(i => i.status !== 'OPEN');
  
  for (const issue of issuesWithHistory) {
    // Find appropriate steward for this issue's location
    const issueLocation = { lat: issue.location_lat, lng: issue.location_lng };
    const responsibleSteward = await findResponsibleSteward(client, issueLocation, stewards);
    
    if (issue.status === 'ACKNOWLEDGED' || issue.status === 'IN_PROGRESS' || issue.status === 'RESOLVED') {
      // Add acknowledgment history
      await client.query(
        `INSERT INTO issue_history (id, issue_id, user_id, old_status, new_status, change_reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${Math.floor(Math.random() * 25)} days')`,
        [uuidv4(), issue.id, responsibleSteward.id, 'OPEN', 'ACKNOWLEDGED', 
         'Issue reviewed and acknowledged by zone steward']
      );
      historyCount++;
    }
    
    if (issue.status === 'IN_PROGRESS' || issue.status === 'RESOLVED') {
      // Add in-progress history
      await client.query(
        `INSERT INTO issue_history (id, issue_id, user_id, old_status, new_status, change_reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${Math.floor(Math.random() * 20)} days')`,
        [uuidv4(), issue.id, responsibleSteward.id, 'ACKNOWLEDGED', 'IN_PROGRESS', 
         'Work initiated by municipal authorities']
      );
      historyCount++;
    }
    
    if (issue.status === 'RESOLVED') {
      // Add resolved history
      await client.query(
        `INSERT INTO issue_history (id, issue_id, user_id, old_status, new_status, change_reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${Math.floor(Math.random() * 10)} days')`,
        [uuidv4(), issue.id, responsibleSteward.id, 'IN_PROGRESS', 'RESOLVED', 
         'Issue successfully resolved and verified']
      );
      historyCount++;
    }
  }
  
  console.log(`✅ Created ${historyCount} history records`);
};

const seedStewardNotes = async (client, users, issues) => {
  console.log('📝 Seeding steward notes...');
  
  const stewards = users.filter(u => u.role === 'STEWARD');
  let noteCount = 0;
  
  const noteTemplates = [
    'Inspected the reported location. Issue confirmed and documented.',
    'Contacted municipal corporation regarding this issue. Reference number: MC-{random}.',
    'Coordinating with electricity department for urgent resolution.',
    'Site visit completed. Estimated repair time: 3-5 working days.',
    'Following up with concerned authorities. Will update progress soon.',
    'Issue has been escalated to senior municipal officials.',
    'Temporary arrangement discussed with local community leaders.',
    'Repair work scheduled for next week. Weather permitting.',
    'Additional inspection required due to complexity of the issue.',
    'Working with technical team to find permanent solution.'
  ];
  
  // Add notes to about 60% of issues
  const issuesForNotes = issues.sort(() => 0.5 - Math.random()).slice(0, Math.floor(issues.length * 0.6));
  
  for (const issue of issuesForNotes) {
    // Find responsible steward for this issue
    const issueLocation = { lat: issue.location_lat, lng: issue.location_lng };
    const responsibleSteward = await findResponsibleSteward(client, issueLocation, stewards);
    
    const numNotes = Math.floor(Math.random() * 2) + 1; // 1-2 notes per issue
    
    for (let i = 0; i < numNotes; i++) {
      let noteText = noteTemplates[Math.floor(Math.random() * noteTemplates.length)];
      
      // Replace placeholders
      noteText = noteText.replace('{random}', Math.floor(Math.random() * 10000) + 1000);
      
      const isPublic = Math.random() > 0.2; // 80% public notes
      
      await client.query(
        `INSERT INTO steward_notes (id, issue_id, steward_id, note, is_public, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${Math.floor(Math.random() * 20)} days')`,
        [uuidv4(), issue.id, responsibleSteward.id, noteText, isPublic]
      );
      
      noteCount++;
    }
  }
  
  console.log(`✅ Created ${noteCount} steward notes`);
};

const seedUserBadges = async (client, users, badges) => {
  console.log('🏅 Seeding user badges...');
  
  const citizens = users.filter(u => u.role === 'CITIZEN');
  let badgeCount = 0;
  
  const firstReporterBadge = badges.find(b => b.name === 'First Reporter');
  const trustedCitizenBadge = badges.find(b => b.name === 'Trusted Citizen');
  const superContributorBadge = badges.find(b => b.name === 'Super Contributor');
  
  // Award "First Reporter" badge to all citizens
  for (const citizen of citizens) {
    await client.query(
      'INSERT INTO user_badges (id, user_id, badge_id, earned_at) VALUES ($1, $2, $3, NOW() - INTERVAL \'30 days\')',
      [uuidv4(), citizen.id, firstReporterBadge.id]
    );
    badgeCount++;
  }
  
  // Award "Trusted Citizen" badge to citizens with 100+ reputation
  const trustedCitizens = citizens.filter(c => c.reputation_score >= 100);
  for (const citizen of trustedCitizens) {
    await client.query(
      'INSERT INTO user_badges (id, user_id, badge_id, earned_at) VALUES ($1, $2, $3, NOW() - INTERVAL \'15 days\')',
      [uuidv4(), citizen.id, trustedCitizenBadge.id]
    );
    badgeCount++;
  }
  
  // Award "Super Contributor" badge to stewards
  const stewards = users.filter(u => u.role === 'STEWARD');
  for (const steward of stewards) {
    if (steward.reputation_score >= 400) {
      await client.query(
        'INSERT INTO user_badges (id, user_id, badge_id, earned_at) VALUES ($1, $2, $3, NOW() - INTERVAL \'10 days\')',
        [uuidv4(), steward.id, superContributorBadge.id]
      );
      badgeCount++;
    }
  }
  
  console.log(`✅ Awarded ${badgeCount} badges`);
};

// Helper function to find responsible steward for an issue location
const findResponsibleSteward = async (client, issueLocation, stewards) => {
  try {
    // Try to find steward whose zone contains this location
    const result = await client.query(`
      SELECT sza.user_id, u.full_name
      FROM steward_zone_assignments sza
      JOIN users u ON sza.user_id = u.id
      WHERE sza.is_active = true
      AND ST_Contains(
        sza.zone_boundaries,
        ST_SetSRID(ST_Point($1, $2), 4326)
      )
      LIMIT 1
    `, [issueLocation.lng, issueLocation.lat]);
    
    if (result.rows.length > 0) {
      return stewards.find(s => s.id === result.rows[0].user_id);
    }
    
    // Fallback: find closest steward by distance
    const distanceResult = await client.query(`
      SELECT sza.user_id, u.full_name,
      ST_Distance(
        ST_SetSRID(ST_Point(sza.center_lng, sza.center_lat), 4326),
        ST_SetSRID(ST_Point($1, $2), 4326)
      ) as distance
      FROM steward_zone_assignments sza
      JOIN users u ON sza.user_id = u.id
      WHERE sza.is_active = true
      ORDER BY distance ASC
      LIMIT 1
    `, [issueLocation.lng, issueLocation.lat]);
    
    if (distanceResult.rows.length > 0) {
      return stewards.find(s => s.id === distanceResult.rows[0].user_id);
    }
    
    // Final fallback: return first steward
    return stewards[0];
    
  } catch (error) {
    console.error('Error finding responsible steward:', error);
    return stewards[0]; // Fallback to first steward
  }
};

// Print credentials and summary
const printSetupSummary = async () => {
  console.log('\n🔑 Test Credentials:');
  console.log('==========================================');
  console.log('Super Admin: admin@naagrik.com / password123');
  console.log('Steward 1 (IIT Campus): steward1@naagrik.com / password123');
  console.log('Steward 2 (Railway Area): steward2@naagrik.com / password123');
  console.log('Steward 3 (Hijli Area): steward3@naagrik.com / password123');
  console.log('Student 1: amit.student@iitkgp.ac.in / password123');
  console.log('Faculty: ravi.faculty@iitkgp.ac.in / password123');
  console.log('Local Citizen: suresh.local@kharagpur.com / password123');
  
  console.log('\n🗺️ Steward Zone Coverage:');
  console.log('==========================================');
  console.log('Zone 1: IIT Campus & Technology Market (Rajesh Kumar Singh)');
  console.log('Zone 2: Railway Station & Medical College (Priya Sharma)');
  console.log('Zone 3: Hijli & Southern Kharagpur (Debasis Mondal)');
  
  console.log('\n📍 Sample Test Locations:');
  console.log('==========================================');
  console.log('IIT Main Gate: 22.3145, 87.3108');
  console.log('Technology Market: 22.3155, 87.3095');
  console.log('Railway Station: 22.3198, 87.3155');
  console.log('Medical College: 22.3195, 87.3165');
  console.log('Hijli Cooperative: 22.3125, 87.3085');
};

// Run the script if called directly
if (require.main === module) {
  resetAndSeed()
    .then(async () => {
      await printSetupSummary();
      console.log('\n🎉 Database reset and seeding completed successfully!');
      console.log('📱 Ready for testing with realistic IIT Kharagpur area data!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database reset and seeding failed:', error);
      process.exit(1);
    });
}

module.exports = resetAndSeed;
