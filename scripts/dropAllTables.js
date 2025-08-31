const { query } = require('../config/database');

const dropAllTables = async () => {
  try {
    console.log('🗑️ Dropping all existing tables and extensions...');
    
    // Drop all tables in cascade to handle dependencies
    const dropTablesQuery = `
      DROP TABLE IF EXISTS user_actions CASCADE;
      DROP TABLE IF EXISTS issue_media CASCADE;
      DROP TABLE IF EXISTS issue_activities CASCADE;
      DROP TABLE IF EXISTS steward_notes CASCADE;
      DROP TABLE IF EXISTS steward_categories CASCADE;
      DROP TABLE IF EXISTS comment_flags CASCADE;
      DROP TABLE IF EXISTS comments CASCADE;
      DROP TABLE IF EXISTS issue_votes CASCADE;
      DROP TABLE IF EXISTS issues CASCADE;
      DROP TABLE IF EXISTS user_badges CASCADE;
      DROP TABLE IF EXISTS badges CASCADE;
      DROP TABLE IF EXISTS steward_applications CASCADE;
      DROP TABLE IF EXISTS issue_categories CASCADE;
      DROP TABLE IF EXISTS zones CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      
      -- Drop old tables that might exist
      DROP TABLE IF EXISTS steward_zones CASCADE;
      DROP TABLE IF EXISTS steward_zone_assignments CASCADE;
      DROP TABLE IF EXISTS categories CASCADE;
      DROP TABLE IF EXISTS issue_history CASCADE;
      
      -- Drop types/enums
      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS issue_status CASCADE;
      DROP TYPE IF EXISTS application_status CASCADE;
      DROP TYPE IF EXISTS media_type CASCADE;
      DROP TYPE IF EXISTS moderation_status CASCADE;
      
      -- Drop extensions (will be recreated)
      DROP EXTENSION IF EXISTS postgis CASCADE;
      DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
    `;
    
    await query(dropTablesQuery);
    
    console.log('✅ All tables and extensions dropped successfully!');
    
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  dropAllTables()
    .then(() => {
      console.log('🎉 Database cleanup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { dropAllTables };
