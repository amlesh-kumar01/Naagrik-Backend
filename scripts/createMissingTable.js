const { query } = require('../config/database');

const createMissingTable = async () => {
  try {
    console.log('Creating missing issue_history table...');
    
    const createIssueHistoryTable = `
-- ISSUE_HISTORY TABLE
CREATE TABLE IF NOT EXISTS issue_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    change_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_history_issue_id ON issue_history(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_history_created_at ON issue_history(created_at);
`;

    await query(createIssueHistoryTable);
    console.log('✅ issue_history table created successfully!');
    
  } catch (error) {
    console.error('❌ Failed to create issue_history table:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  createMissingTable()
    .then(() => {
      console.log('🎉 Missing table creation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Missing table creation failed:', error);
      process.exit(1);
    });
}

module.exports = { createMissingTable };
