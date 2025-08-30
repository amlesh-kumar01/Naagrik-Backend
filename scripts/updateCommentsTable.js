const { query } = require('../config/database');

/**
 * Migration script to update comments table structure
 * Adds parent_comment_id and other missing fields to existing comments table
 */

const updateCommentsTableStructure = async () => {
  try {
    console.log('🔄 Starting comments table structure update...');

    // Add parent_comment_id column for nested comments
    console.log('📝 Adding parent_comment_id column...');
    await query(`
      ALTER TABLE comments 
      ADD COLUMN IF NOT EXISTS parent_comment_id UUID 
      REFERENCES comments(id) ON DELETE CASCADE;
    `);

    // Add is_flagged column for comment moderation
    console.log('🚩 Adding is_flagged column...');
    await query(`
      ALTER TABLE comments 
      ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    // Add flag_count column to track number of flags
    console.log('📊 Adding flag_count column...');
    await query(`
      ALTER TABLE comments 
      ADD COLUMN IF NOT EXISTS flag_count INTEGER NOT NULL DEFAULT 0;
    `);

    // Add updated_at column for timestamp tracking
    console.log('⏰ Adding updated_at column...');
    await query(`
      ALTER TABLE comments 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `);

    // Create function for updating updated_at timestamp
    console.log('⚡ Creating update timestamp function...');
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create trigger for updated_at
    console.log('🔄 Creating updated_at trigger...');
    await query(`
      DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
      CREATE TRIGGER update_comments_updated_at
          BEFORE UPDATE ON comments
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    // Add indexes for better performance
    console.log('📊 Creating performance indexes...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
      CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
      CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
      CREATE INDEX IF NOT EXISTS idx_comments_flagged ON comments(is_flagged);
    `);

    // Create comment_flags table for detailed flag tracking
    console.log('🚩 Creating comment_flags table...');
    await query(`
      CREATE TABLE IF NOT EXISTS comment_flags (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        details TEXT,
        status moderation_status NOT NULL DEFAULT 'PENDING',
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(comment_id, user_id)
      );
    `);

    // Add index for comment_flags
    await query(`
      CREATE INDEX IF NOT EXISTS idx_comment_flags_comment_id ON comment_flags(comment_id);
      CREATE INDEX IF NOT EXISTS idx_comment_flags_status ON comment_flags(status);
      CREATE INDEX IF NOT EXISTS idx_comment_flags_user_id ON comment_flags(user_id);
    `);

    console.log('✅ Comments table structure update completed successfully!');
    
    // Display updated table structure
    console.log('\n📋 Updated Comments Table Structure:');
    const tableInfo = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'comments'
      ORDER BY ordinal_position;
    `);
    
    console.table(tableInfo.rows);

  } catch (error) {
    console.error('❌ Comments table update failed:', error);
    throw error;
  }
};

module.exports = { updateCommentsTableStructure };

// Run migration if called directly
if (require.main === module) {
  updateCommentsTableStructure()
    .then(() => {
      console.log('Comments table update completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Comments table update failed:', error);
      process.exit(1);
    });
}
