const { query } = require('../config/database');

const createExtensions = `
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
-- Enable pgvector for AI similarity search (requires separate installation)
-- CREATE EXTENSION IF NOT EXISTS vector;
`;

const createEnums = `
-- 1. DEFINE CUSTOM TYPES (ENUMS)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('CITIZEN', 'STEWARD', 'SUPER_ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE issue_status AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED', 'DUPLICATE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE media_type AS ENUM ('IMAGE', 'VIDEO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE moderation_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
`;

const createUsersTable = `
-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'CITIZEN',
    reputation_score INTEGER NOT NULL DEFAULT 0,
    risk_score FLOAT NOT NULL DEFAULT 0.0 CHECK (risk_score >= 0.0 AND risk_score <= 1.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createIssuesTable = `
-- 3. ISSUES TABLE
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category_id INTEGER,
    primary_issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status issue_status NOT NULL DEFAULT 'OPEN',
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    address TEXT,
    thumbnail_url TEXT,
    vote_score INTEGER NOT NULL DEFAULT 0,
    ai_flag BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
`;

const createBadgesTable = `
-- 4. BADGES TABLE
CREATE TABLE IF NOT EXISTS badges (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon_url TEXT,
    required_score INTEGER NOT NULL DEFAULT 0
);
`;

const createUserBadgesTable = `
-- 5. USER_BADGES TABLE
CREATE TABLE IF NOT EXISTS user_badges (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);
`;

const createIssueCategoriesTable = `
-- 6. ISSUE_CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS issue_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);
`;

const createCommentsTable = `
-- 7. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    ai_flag BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createIssueVotesTable = `
-- 8. ISSUE_VOTES TABLE
CREATE TABLE IF NOT EXISTS issue_votes (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    vote_type SMALLINT NOT NULL CHECK (vote_type IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, issue_id)
);
`;

const createIssueHistoryTable = `
-- 9. ISSUE_HISTORY TABLE
CREATE TABLE IF NOT EXISTS issue_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    old_status issue_status,
    new_status issue_status NOT NULL,
    change_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createStewardApplicationsTable = `
-- 10. STEWARD_APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS steward_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    justification TEXT NOT NULL,
    status application_status NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);
`;

const createAdminZonesTable = `
-- 11. ADMIN_ZONES TABLE
CREATE TABLE IF NOT EXISTS admin_zones (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createStewardZoneAssignmentsTable = `
-- 12. STEWARD_ZONE_ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS steward_zone_assignments (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    zone_id INTEGER NOT NULL REFERENCES admin_zones(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, zone_id)
);
`;

const createStewardNotesTable = `
-- 13. STEWARD_NOTES TABLE
CREATE TABLE IF NOT EXISTS steward_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    steward_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createIssueMediaTable = `
-- 14. ISSUE_MEDIA TABLE
CREATE TABLE IF NOT EXISTS issue_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type media_type NOT NULL,
    moderation_status moderation_status NOT NULL DEFAULT 'PENDING',
    moderation_score FLOAT,
    ai_tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createUserActionsTable = `
-- 15. USER_ACTIONS TABLE
CREATE TABLE IF NOT EXISTS user_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    target_id UUID,
    ip_address_hash TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const addConstraints = `
-- Add foreign key constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_issues_category_id') THEN
        ALTER TABLE issues ADD CONSTRAINT fk_issues_category_id 
        FOREIGN KEY (category_id) REFERENCES issue_categories(id) ON DELETE SET NULL;
    END IF;
END $$;
`;

const createIndexes = `
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_issues_user_id ON issues(user_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_category_id ON issues(category_id);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at);
CREATE INDEX IF NOT EXISTS idx_issues_location ON issues(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_comments_issue_id ON comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_votes_issue_id ON issue_votes(issue_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_reputation_score ON users(reputation_score DESC);
`;

const createTriggers = `
-- Trigger to automatically award badges when reputation score changes
CREATE OR REPLACE FUNCTION award_badges_on_reputation_change()
RETURNS TRIGGER AS $$
DECLARE
    badge_record RECORD;
BEGIN
    FOR badge_record IN SELECT id FROM badges WHERE required_score <= NEW.reputation_score
    LOOP
        INSERT INTO user_badges (user_id, badge_id)
        VALUES (NEW.id, badge_record.id)
        ON CONFLICT (user_id, badge_id) DO NOTHING;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reputation_change_badge_trigger ON users;
CREATE TRIGGER reputation_change_badge_trigger
AFTER UPDATE OF reputation_score ON users
FOR EACH ROW
WHEN (OLD.reputation_score IS DISTINCT FROM NEW.reputation_score)
EXECUTE FUNCTION award_badges_on_reputation_change();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_issues_updated_at ON issues;
CREATE TRIGGER update_issues_updated_at
    BEFORE UPDATE ON issues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
`;

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');
    
    console.log('📦 Creating extensions...');
    await query(createExtensions);
    
    console.log('🔧 Creating enums...');
    await query(createEnums);
    
    console.log('👥 Creating users table...');
    await query(createUsersTable);
    
    console.log('📂 Creating issue categories table...');
    await query(createIssueCategoriesTable);
    
    console.log('📋 Creating issues table...');
    await query(createIssuesTable);
    
    console.log('🏆 Creating badges table...');
    await query(createBadgesTable);
    
    console.log('🎖️ Creating user badges table...');
    await query(createUserBadgesTable);
    
    console.log('💬 Creating comments table...');
    await query(createCommentsTable);
    
    console.log('🗳️ Creating issue votes table...');
    await query(createIssueVotesTable);
    
    console.log('📜 Creating issue history table...');
    await query(createIssueHistoryTable);
    
    console.log('🛡️ Creating steward applications table...');
    await query(createStewardApplicationsTable);
    
    console.log('🗺️ Creating admin zones table...');
    await query(createAdminZonesTable);
    
    console.log('📍 Creating steward zone assignments table...');
    await query(createStewardZoneAssignmentsTable);
    
    console.log('📝 Creating steward notes table...');
    await query(createStewardNotesTable);
    
    console.log('🖼️ Creating issue media table...');
    await query(createIssueMediaTable);
    
    console.log('👤 Creating user actions table...');
    await query(createUserActionsTable);
    
    console.log('🔗 Adding constraints...');
    await query(addConstraints);
    
    console.log('⚡ Creating indexes...');
    await query(createIndexes);
    
    console.log('🔄 Creating triggers...');
    await query(createTriggers);
    
    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

module.exports = { runMigration };
