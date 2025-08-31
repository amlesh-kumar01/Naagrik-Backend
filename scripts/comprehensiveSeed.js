const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Clear existing data
    await clearExistingData();
    
    // Seed data in the correct order
    await seedCategories();
    await seedZones();
    await seedUsers();
    await seedBadges();
    await seedIssues();
    await seedStewardCategories();
    await seedComments();
    await seedVotes();
    
    console.log('✅ Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
};

const clearExistingData = async () => {
  console.log('🗑️ Clearing existing data...');
  
  const clearQueries = [
    'DELETE FROM user_actions',
    'DELETE FROM issue_media',
    'DELETE FROM issue_activities',
    'DELETE FROM steward_notes',
    'DELETE FROM user_badges',
    'DELETE FROM issue_votes',
    'DELETE FROM comments',
    'DELETE FROM steward_categories',
    'DELETE FROM steward_applications',
    'DELETE FROM issues',
    'DELETE FROM badges',
    'DELETE FROM issue_categories',
    'DELETE FROM zones',
    'DELETE FROM users'
  ];
  
  for (const query_text of clearQueries) {
    await query(query_text);
  }
};

const seedCategories = async () => {
  console.log('📂 Seeding issue categories...');
  
  const categories = [
    { name: 'Road and Transportation', description: 'Issues related to roads, traffic, public transportation' },
    { name: 'Water and Sanitation', description: 'Water supply issues, drainage, waste management' },
    { name: 'Electricity and Power', description: 'Power outages, street lighting, electrical issues' },
    { name: 'Healthcare and Safety', description: 'Public health concerns, safety issues' },
    { name: 'Education and Infrastructure', description: 'Schools, colleges, educational infrastructure' },
    { name: 'Environment and Cleanliness', description: 'Environmental concerns, garbage collection, cleanliness' },
    { name: 'Public Services', description: 'Government services, documentation issues' },
    { name: 'Security and Crime', description: 'Safety concerns, criminal activities' },
    { name: 'Technology and Digital', description: 'Digital infrastructure, internet connectivity' },
    { name: 'Others', description: 'Miscellaneous issues not covered in other categories' }
  ];
  
  global.categoryIds = {};
  
  for (const category of categories) {
    const result = await query(`
      INSERT INTO issue_categories (name, description)
      VALUES ($1, $2)
      RETURNING id
    `, [category.name, category.description]);
    
    // Store category ID by name for easy reference
    global.categoryIds[category.name] = result.rows[0].id;
  }
};

const seedZones = async () => {
  console.log('🏢 Seeding zones...');
  
  const zones = [
    {
      id: uuidv4(),
      name: 'IIT Kharagpur Campus',
      type: 'EDUCATIONAL',
      description: 'Main IIT Kharagpur campus area',
      area_name: 'IIT Campus',
      pincode: '721302'
    },
    {
      id: uuidv4(),
      name: 'Kharagpur Technology Park',
      type: 'COMMERCIAL',
      description: 'Technology park and commercial area',
      area_name: 'Tech Park',
      pincode: '721302'
    },
    {
      id: uuidv4(),
      name: 'Kharagpur Railway Station Area',
      type: 'TRANSPORTATION',
      description: 'Railway station and surrounding transport hub',
      area_name: 'Railway Station',
      pincode: '721301'
    },
    {
      id: uuidv4(),
      name: 'Kharagpur Main Market',
      type: 'COMMERCIAL',
      description: 'Central market and shopping area',
      area_name: 'Main Market',
      pincode: '721301'
    },
    {
      id: uuidv4(),
      name: 'Kharagpur Hospital Area',
      type: 'HEALTHCARE',
      description: 'Hospital and medical facilities area',
      area_name: 'Hospital Area',
      pincode: '721301'
    },
    {
      id: uuidv4(),
      name: 'Hijli Industrial Area',
      type: 'INDUSTRIAL',
      description: 'Industrial zone near Kharagpur',
      area_name: 'Hijli Industrial',
      pincode: '721306'
    },
    {
      id: uuidv4(),
      name: 'Kharagpur Residential Zone 1',
      type: 'RESIDENTIAL',
      description: 'Residential area near IIT',
      area_name: 'Residential Zone 1',
      pincode: '721302'
    },
    {
      id: uuidv4(),
      name: 'Kharagpur Residential Zone 2',
      type: 'RESIDENTIAL',
      description: 'Residential area near railway station',
      area_name: 'Residential Zone 2',
      pincode: '721301'
    }
  ];
  
  for (const zone of zones) {
    await query(`
      INSERT INTO zones (id, name, type, description, area_name, pincode)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [zone.id, zone.name, zone.type, zone.description, zone.area_name, zone.pincode]);
  }
  
  // Store zone IDs for later use
  global.zoneIds = zones.map(z => z.id);
};

const seedUsers = async () => {
  console.log('👥 Seeding users...');
  
  const password = await bcrypt.hash('password123', 10);
  
  const users = [
    {
      id: uuidv4(),
      email: 'admin@naagrik.com',
      full_name: 'Super Administrator',
      role: 'SUPER_ADMIN',
      phone_number: '9876543210',
      address_line1: 'IIT Kharagpur Campus',
      city: 'Kharagpur',
      state: 'West Bengal',
      pincode: '721302',
      is_verified: true,
      reputation_score: 1000
    },
    {
      id: uuidv4(),
      email: 'steward1@naagrik.com',
      full_name: 'Rajesh Kumar Steward',
      role: 'STEWARD',
      phone_number: '9876543211',
      address_line1: 'Near IIT Main Gate',
      city: 'Kharagpur',
      state: 'West Bengal',
      pincode: '721302',
      is_verified: true,
      reputation_score: 500,
      occupation: 'Public Service Officer',
      organization: 'Kharagpur Municipality'
    },
    {
      id: uuidv4(),
      email: 'steward2@naagrik.com',
      full_name: 'Priya Singh Steward',
      role: 'STEWARD',
      phone_number: '9876543212',
      address_line1: 'Railway Station Road',
      city: 'Kharagpur',
      state: 'West Bengal',
      pincode: '721301',
      is_verified: true,
      reputation_score: 450,
      occupation: 'Infrastructure Manager',
      organization: 'Public Works Department'
    },
    {
      id: uuidv4(),
      email: 'steward3@naagrik.com',
      full_name: 'Amit Sharma Steward',
      role: 'STEWARD',
      phone_number: '9876543213',
      address_line1: 'Technology Park',
      city: 'Kharagpur',
      state: 'West Bengal',
      pincode: '721302',
      is_verified: true,
      reputation_score: 480,
      occupation: 'Safety Officer',
      organization: 'District Administration'
    },
    {
      id: uuidv4(),
      email: 'citizen1@student.iitkgp.ac.in',
      full_name: 'Rahul Verma',
      role: 'CITIZEN',
      phone_number: '8765432101',
      address_line1: 'Azad Hall of Residence',
      address_line2: 'IIT Kharagpur',
      city: 'Kharagpur',
      state: 'West Bengal',
      pincode: '721302',
      is_verified: true,
      reputation_score: 85,
      occupation: 'Student',
      organization: 'IIT Kharagpur',
      date_of_birth: '2002-05-15',
      gender: 'Male'
    },
    {
      id: uuidv4(),
      email: 'citizen2@student.iitkgp.ac.in',
      full_name: 'Sneha Patel',
      role: 'CITIZEN',
      phone_number: '8765432102',
      address_line1: 'Sarojini Naidu Hall',
      address_line2: 'IIT Kharagpur',
      city: 'Kharagpur',
      state: 'West Bengal',
      pincode: '721302',
      is_verified: true,
      reputation_score: 92,
      occupation: 'Student',
      organization: 'IIT Kharagpur',
      date_of_birth: '2001-08-22',
      gender: 'Female'
    },
    {
      id: uuidv4(),
      email: 'citizen3@gmail.com',
      full_name: 'Manoj Gupta',
      role: 'CITIZEN',
      phone_number: '8765432103',
      address_line1: 'Near Railway Station',
      city: 'Kharagpur',
      state: 'West Bengal',
      pincode: '721301',
      is_verified: true,
      reputation_score: 67,
      occupation: 'Shop Owner',
      organization: 'Local Business',
      date_of_birth: '1985-12-10',
      gender: 'Male'
    },
    {
      id: uuidv4(),
      email: 'citizen4@gmail.com',
      full_name: 'Anjali Mishra',
      role: 'CITIZEN',
      phone_number: '8765432104',
      address_line1: 'Hospital Road',
      city: 'Kharagpur',
      state: 'West Bengal',
      pincode: '721301',
      is_verified: true,
      reputation_score: 73,
      occupation: 'Teacher',
      organization: 'Local School',
      date_of_birth: '1990-03-18',
      gender: 'Female'
    },
    {
      id: uuidv4(),
      email: 'citizen5@iitkgp.ac.in',
      full_name: 'Dr. Vikash Singh',
      role: 'CITIZEN',
      phone_number: '8765432105',
      address_line1: 'Faculty Quarter Type-VI',
      address_line2: 'IIT Kharagpur',
      city: 'Kharagpur',
      state: 'West Bengal',
      pincode: '721302',
      is_verified: true,
      reputation_score: 156,
      occupation: 'Professor',
      organization: 'IIT Kharagpur',
      date_of_birth: '1975-09-25',
      gender: 'Male'
    }
  ];
  
  for (const user of users) {
    await query(`
      INSERT INTO users (
        id, email, password_hash, full_name, role, phone_number, 
        address_line1, address_line2, city, state, pincode, 
        is_verified, reputation_score, occupation, organization,
        date_of_birth, gender, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
      )
    `, [
      user.id, user.email, password, user.full_name, user.role, user.phone_number,
      user.address_line1, user.address_line2 || null, user.city, user.state, user.pincode,
      user.is_verified, user.reputation_score, user.occupation || null, user.organization || null,
      user.date_of_birth || null, user.gender || null
    ]);
  }
  
  // Store user IDs for later use
  global.userIds = {
    admin: users[0].id,
    steward1: users[1].id,
    steward2: users[2].id,
    steward3: users[3].id,
    citizen1: users[4].id,
    citizen2: users[5].id,
    citizen3: users[6].id,
    citizen4: users[7].id,
    citizen5: users[8].id
  };
};

const seedBadges = async () => {
  console.log('🏆 Seeding badges...');
  
  const badges = [
    { name: 'First Report', description: 'Submitted your first issue report', required_score: 10 },
    { name: 'Problem Solver', description: 'Reported 5 issues that got resolved', required_score: 50 },
    { name: 'Community Helper', description: 'Helped improve the community', required_score: 100 },
    { name: 'Trusted Reporter', description: 'Consistently reports quality issues', required_score: 200 },
    { name: 'Community Champion', description: 'Made significant contributions', required_score: 500 },
    { name: 'Super Contributor', description: 'Outstanding community service', required_score: 1000 }
  ];
  
  for (const badge of badges) {
    await query(`
      INSERT INTO badges (name, description, required_score)
      VALUES ($1, $2, $3)
    `, [badge.name, badge.description, badge.required_score]);
  }
};

const seedIssues = async () => {
  console.log('🚨 Seeding issues...');
  
  const issues = [
    {
      id: uuidv4(),
      user_id: global.userIds.citizen1,
      category_id: global.categoryIds['Road and Transportation'],
      zone_id: global.zoneIds[0], // IIT Campus
      title: 'Pothole on Academic Area Road',
      description: 'There is a large pothole on the road near the Academic Area that poses risk to vehicles and pedestrians. The pothole has been growing larger due to recent rains.',
      status: 'OPEN',
      location_lat: 22.3149,
      location_lng: 87.3105,
      address: 'Academic Area Road, IIT Kharagpur',
      vote_score: 12,
      urgency_score: 7
    },
    {
      id: uuidv4(),
      user_id: global.userIds.citizen2,
      category_id: global.categoryIds['Water and Sanitation'],
      zone_id: global.zoneIds[1], // Tech Park
      title: 'Water Logging in Technology Park',
      description: 'Heavy water logging in the Technology Park area during monsoon. The drainage system seems inadequate and needs immediate attention.',
      status: 'ACKNOWLEDGED',
      location_lat: 22.3220,
      location_lng: 87.3180,
      address: 'Technology Park, Kharagpur',
      vote_score: 18,
      urgency_score: 9,
      assigned_steward_id: global.userIds.steward1
    },
    {
      id: uuidv4(),
      user_id: global.userIds.citizen3,
      category_id: global.categoryIds['Electricity and Power'],
      zone_id: global.zoneIds[2], // Railway Station
      title: 'Street Light Not Working',
      description: 'Multiple street lights near the railway station are not working, making the area unsafe during night hours.',
      status: 'IN_PROGRESS',
      location_lat: 22.3260,
      location_lng: 87.3200,
      address: 'Railway Station Road, Kharagpur',
      vote_score: 8,
      urgency_score: 8,
      assigned_steward_id: global.userIds.steward2
    },
    {
      id: uuidv4(),
      user_id: global.userIds.citizen4,
      category_id: global.categoryIds['Environment and Cleanliness'],
      zone_id: global.zoneIds[3], // Main Market
      title: 'Garbage Collection Issue',
      description: 'Garbage has not been collected from the main market area for the past 3 days. This is creating hygiene issues and bad odor.',
      status: 'OPEN',
      location_lat: 22.3280,
      location_lng: 87.3150,
      address: 'Main Market, Kharagpur',
      vote_score: 15,
      urgency_score: 6
    },
    {
      id: uuidv4(),
      user_id: global.userIds.citizen5,
      category_id: global.categoryIds['Healthcare and Safety'],
      zone_id: global.zoneIds[4], // Hospital Area
      title: 'Ambulance Access Issue',
      description: 'The road leading to the hospital has become very narrow due to encroachments, making it difficult for ambulances to pass quickly.',
      status: 'RESOLVED',
      location_lat: 22.3300,
      location_lng: 87.3120,
      address: 'Hospital Road, Kharagpur',
      vote_score: 22,
      urgency_score: 10,
      assigned_steward_id: global.userIds.steward3,
      resolved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    },
    {
      id: uuidv4(),
      user_id: global.userIds.citizen1,
      category_id: global.categoryIds['Technology and Digital'],
      zone_id: global.zoneIds[0], // IIT Campus
      title: 'WiFi Connectivity Issues in Library',
      description: 'WiFi connectivity in the Central Library is very poor. Students are unable to access online resources properly.',
      status: 'ACKNOWLEDGED',
      location_lat: 22.3170,
      location_lng: 87.3110,
      address: 'Central Library, IIT Kharagpur',
      vote_score: 25,
      urgency_score: 5,
      assigned_steward_id: global.userIds.steward1
    },
    {
      id: uuidv4(),
      user_id: global.userIds.citizen2,
      category_id: global.categoryIds['Security and Crime'],
      zone_id: global.zoneIds[6], // Residential Zone 1
      title: 'Inadequate Security at Night',
      description: 'The residential area lacks proper security patrol during night hours. Residents feel unsafe walking alone after 10 PM.',
      status: 'OPEN',
      location_lat: 22.3190,
      location_lng: 87.3080,
      address: 'Residential Zone 1, Kharagpur',
      vote_score: 19,
      urgency_score: 8
    },
    {
      id: uuidv4(),
      user_id: global.userIds.citizen3,
      category_id: global.categoryIds['Road and Transportation'],
      zone_id: global.zoneIds[7], // Residential Zone 2
      title: 'Bus Stop Shelter Damaged',
      description: 'The bus stop shelter near residential zone 2 is completely damaged and provides no protection from rain or sun.',
      status: 'OPEN',
      location_lat: 22.3250,
      location_lng: 87.3170,
      address: 'Bus Stop, Residential Zone 2',
      vote_score: 11,
      urgency_score: 4
    }
  ];
  
  for (const issue of issues) {
    await query(`
      INSERT INTO issues (
        id, user_id, category_id, zone_id, title, description, status,
        location_lat, location_lng, address, vote_score, urgency_score,
        assigned_steward_id, resolved_at, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
        NOW() - INTERVAL '1 day' * RANDOM() * 30
      )
    `, [
      issue.id, issue.user_id, issue.category_id, issue.zone_id, issue.title,
      issue.description, issue.status, issue.location_lat, issue.location_lng,
      issue.address, issue.vote_score, issue.urgency_score, issue.assigned_steward_id || null,
      issue.resolved_at || null
    ]);
  }
  
  global.issueIds = issues.map(i => i.id);
};

const seedStewardCategories = async () => {
  console.log('👨‍💼 Seeding steward category assignments...');
  
  const assignments = [
    // Steward 1 handles Road/Transportation and Technology in IIT Campus and Tech Park
    { steward_id: global.userIds.steward1, category_id: global.categoryIds['Road and Transportation'], zone_id: global.zoneIds[0], notes: 'Campus road maintenance specialist' },
    { steward_id: global.userIds.steward1, category_id: global.categoryIds['Technology and Digital'], zone_id: global.zoneIds[0], notes: 'IT infrastructure coordinator' },
    { steward_id: global.userIds.steward1, category_id: global.categoryIds['Water and Sanitation'], zone_id: global.zoneIds[1], notes: 'Water management in tech park' },
    
    // Steward 2 handles Electricity, Security in Railway Station and Market areas
    { steward_id: global.userIds.steward2, category_id: global.categoryIds['Electricity and Power'], zone_id: global.zoneIds[2], notes: 'Electrical maintenance for transport hub' },
    { steward_id: global.userIds.steward2, category_id: global.categoryIds['Security and Crime'], zone_id: global.zoneIds[2], notes: 'Security coordinator for railway area' },
    { steward_id: global.userIds.steward2, category_id: global.categoryIds['Electricity and Power'], zone_id: global.zoneIds[3], notes: 'Market area electrical issues' },
    
    // Steward 3 handles Healthcare, Environment, and Safety across multiple zones
    { steward_id: global.userIds.steward3, category_id: global.categoryIds['Healthcare and Safety'], zone_id: global.zoneIds[4], notes: 'Healthcare infrastructure specialist' },
    { steward_id: global.userIds.steward3, category_id: global.categoryIds['Environment and Cleanliness'], zone_id: global.zoneIds[3], notes: 'Market sanitation coordinator' },
    { steward_id: global.userIds.steward3, category_id: global.categoryIds['Security and Crime'], zone_id: global.zoneIds[6], notes: 'Residential security officer' },
    { steward_id: global.userIds.steward3, category_id: global.categoryIds['Security and Crime'], zone_id: global.zoneIds[7], notes: 'Residential security officer' },
  ];
  
  for (const assignment of assignments) {
    await query(`
      INSERT INTO steward_categories (steward_id, category_id, zone_id, assigned_by, notes, assigned_at)
      VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '1 month')
    `, [assignment.steward_id, assignment.category_id, assignment.zone_id, global.userIds.admin, assignment.notes]);
  }
};

const seedComments = async () => {
  console.log('💬 Seeding comments...');
  
  const comments = [
    {
      user_id: global.userIds.citizen2,
      issue_id: global.issueIds[0], // Pothole issue
      content: 'I saw this pothole yesterday. It\'s getting worse and already caused a bike accident.'
    },
    {
      user_id: global.userIds.steward1,
      issue_id: global.issueIds[0],
      content: 'Thank you for reporting this. We have forwarded this to the road maintenance team. Expected resolution within 5 working days.'
    },
    {
      user_id: global.userIds.citizen3,
      issue_id: global.issueIds[1], // Water logging issue
      content: 'This happens every year during monsoon. The drainage system needs a permanent solution.'
    },
    {
      user_id: global.userIds.citizen5,
      issue_id: global.issueIds[5], // WiFi issue
      content: 'As a faculty member, I can confirm this is affecting our online classes too. Please prioritize this issue.'
    },
    {
      user_id: global.userIds.steward1,
      issue_id: global.issueIds[5],
      content: 'We are working with the IT department to upgrade the network infrastructure. Temporary solution should be available by next week.'
    }
  ];
  
  for (const comment of comments) {
    await query(`
      INSERT INTO comments (user_id, issue_id, content, created_at)
      VALUES ($1, $2, $3, NOW() - INTERVAL '1 day' * RANDOM() * 15)
    `, [comment.user_id, comment.issue_id, comment.content]);
  }
};

const seedVotes = async () => {
  console.log('🗳️ Seeding votes...');
  
  const votes = [
    // Multiple users voting on pothole issue
    { user_id: global.userIds.citizen2, issue_id: global.issueIds[0], vote_type: 1 },
    { user_id: global.userIds.citizen3, issue_id: global.issueIds[0], vote_type: 1 },
    { user_id: global.userIds.citizen4, issue_id: global.issueIds[0], vote_type: 1 },
    { user_id: global.userIds.citizen5, issue_id: global.issueIds[0], vote_type: 1 },
    
    // Water logging issue votes
    { user_id: global.userIds.citizen1, issue_id: global.issueIds[1], vote_type: 1 },
    { user_id: global.userIds.citizen3, issue_id: global.issueIds[1], vote_type: 1 },
    { user_id: global.userIds.citizen4, issue_id: global.issueIds[1], vote_type: 1 },
    { user_id: global.userIds.citizen5, issue_id: global.issueIds[1], vote_type: 1 },
    
    // Street light issue votes
    { user_id: global.userIds.citizen1, issue_id: global.issueIds[2], vote_type: 1 },
    { user_id: global.userIds.citizen2, issue_id: global.issueIds[2], vote_type: 1 },
    
    // WiFi issue votes (popular issue)
    { user_id: global.userIds.citizen2, issue_id: global.issueIds[5], vote_type: 1 },
    { user_id: global.userIds.citizen3, issue_id: global.issueIds[5], vote_type: 1 },
    { user_id: global.userIds.citizen4, issue_id: global.issueIds[5], vote_type: 1 },
  ];
  
  for (const vote of votes) {
    await query(`
      INSERT INTO issue_votes (user_id, issue_id, vote_type, created_at)
      VALUES ($1, $2, $3, NOW() - INTERVAL '1 day' * RANDOM() * 20)
    `, [vote.user_id, vote.issue_id, vote.vote_type]);
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Database seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
