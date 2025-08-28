#!/usr/bin/env node

const { runMigration } = require('./migrate');
const { runSeed } = require('./seed');

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'migrate':
        console.log('🔄 Running database migrations...');
        await runMigration();
        break;
        
      case 'seed':
        console.log('🌱 Seeding database...');
        await runSeed();
        break;
        
      case 'setup':
        console.log('🔧 Setting up database (migrate + seed)...');
        await runMigration();
        await runSeed();
        break;
        
      default:
        console.log(`
📚 Naagrik Database CLI

Usage: node scripts/cli.js <command>

Commands:
  migrate    Run database migrations
  seed       Seed database with initial data
  setup      Run migrations and seed (full setup)

Examples:
  node scripts/cli.js migrate
  node scripts/cli.js seed
  node scripts/cli.js setup
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}
