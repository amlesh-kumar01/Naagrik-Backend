#!/usr/bin/env node

/**
 * Master Setup Script for Naagrik Backend
 * 
 * This script provides a complete setup solution for the Naagrik backend application.
 * It handles database reset, seeding with realistic data, and image management.
 * 
 * Usage:
 *   npm run setup              - Full setup with placeholder images
 *   npm run setup:real-images  - Full setup with real images from Cloudinary
 *   npm run setup:clean        - Only reset database (no seeding)
 *   npm run setup:seed-only    - Only seed data (don't reset tables)
 */

const path = require('path');
const { query } = require('../config/database');

// Import required modules
const resetAndSeed = require('./resetAndSeed');
const { runImageSeeding } = require('./seedImages');

// Configuration
const SCRIPT_CONFIG = {
  // Check if Cloudinary is configured
  CLOUDINARY_AVAILABLE: !!(
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET
  ),
  
  // Default settings
  DEFAULT_USE_REAL_IMAGES: process.env.CLOUDINARY_CLOUD_NAME ? true : false,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000
};

class MasterSetup {
  constructor(options = {}) {
    this.options = {
      resetDatabase: true,
      seedData: true,
      seedImages: true,
      useRealImages: SCRIPT_CONFIG.DEFAULT_USE_REAL_IMAGES,
      verbose: true,
      ...options
    };
    
    this.stats = {
      startTime: Date.now(),
      tablesCreated: 0,
      usersCreated: 0,
      issuesCreated: 0,
      mediaCreated: 0,
      errors: []
    };
  }

  log(message, level = 'info') {
    if (!this.options.verbose && level === 'debug') return;
    
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍'
    }[level] || 'ℹ️';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async checkDatabaseConnection() {
    this.log('Checking database connection...', 'debug');
    try {
      const result = await query('SELECT NOW() as current_time, version() as pg_version');
      this.log(`Database connected: PostgreSQL ${result.rows[0].pg_version.split(' ')[1]}`, 'success');
      return true;
    } catch (error) {
      this.log(`Database connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  async checkCloudinaryConfig() {
    if (!this.options.seedImages || !this.options.useRealImages) {
      return true;
    }

    this.log('Checking Cloudinary configuration...', 'debug');
    
    if (!SCRIPT_CONFIG.CLOUDINARY_AVAILABLE) {
      this.log('Cloudinary not configured, will use placeholder images', 'warning');
      this.options.useRealImages = false;
      return true;
    }

    this.log('Cloudinary configuration found', 'success');
    return true;
  }

  async resetDatabase() {
    if (!this.options.resetDatabase) {
      this.log('Skipping database reset', 'debug');
      return;
    }

    this.log('Starting database reset and seeding...');
    
    try {
      await resetAndSeed();
      this.log('Database reset and seeding completed', 'success');
    } catch (error) {
      this.log(`Database reset failed: ${error.message}`, 'error');
      this.stats.errors.push({ phase: 'database_reset', error: error.message });
      throw error;
    }
  }

  async seedImages() {
    if (!this.options.seedImages) {
      this.log('Skipping image seeding', 'debug');
      return;
    }

    this.log(`Starting image seeding (${this.options.useRealImages ? 'real images' : 'placeholder images'})...`);
    
    try {
      const mediaCount = await runImageSeeding(this.options.useRealImages);
      this.stats.mediaCreated = mediaCount;
      this.log(`Image seeding completed: ${mediaCount} media files created`, 'success');
    } catch (error) {
      this.log(`Image seeding failed: ${error.message}`, 'error');
      this.stats.errors.push({ phase: 'image_seeding', error: error.message });
      
      // Try fallback to placeholder images
      if (this.options.useRealImages) {
        this.log('Attempting fallback to placeholder images...', 'warning');
        try {
          const mediaCount = await runImageSeeding(false);
          this.stats.mediaCreated = mediaCount;
          this.log(`Fallback successful: ${mediaCount} placeholder images created`, 'success');
        } catch (fallbackError) {
          this.log(`Fallback also failed: ${fallbackError.message}`, 'error');
          this.stats.errors.push({ phase: 'image_fallback', error: fallbackError.message });
        }
      } else {
        throw error;
      }
    }
  }

  async getSetupStats() {
    try {
      // Get user count
      const usersResult = await query('SELECT COUNT(*) as count FROM users');
      this.stats.usersCreated = parseInt(usersResult.rows[0].count);

      // Get issues count  
      const issuesResult = await query('SELECT COUNT(*) as count FROM issues');
      this.stats.issuesCreated = parseInt(issuesResult.rows[0].count);

      // Get media count
      const mediaResult = await query('SELECT COUNT(*) as count FROM issue_media');
      this.stats.mediaCreated = parseInt(mediaResult.rows[0].count);

      // Get table count
      const tablesResult = await query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);
      this.stats.tablesCreated = parseInt(tablesResult.rows[0].count);

    } catch (error) {
      this.log(`Failed to get setup stats: ${error.message}`, 'warning');
    }
  }

  async run() {
    this.log('🚀 Starting Naagrik Backend Setup...');
    this.log(`Configuration: Reset=${this.options.resetDatabase}, Seed=${this.options.seedData}, Images=${this.options.seedImages}, RealImages=${this.options.useRealImages}`);

    try {
      // Pre-checks
      const dbConnected = await this.checkDatabaseConnection();
      if (!dbConnected) {
        throw new Error('Database connection failed');
      }

      await this.checkCloudinaryConfig();

      // Main setup phases
      await this.resetDatabase();
      await this.seedImages();

      // Get final stats
      await this.getSetupStats();

      // Success summary
      this.printSummary();
      
    } catch (error) {
      this.log(`Setup failed: ${error.message}`, 'error');
      this.printErrorSummary();
      throw error;
    }
  }

  printSummary() {
    const duration = ((Date.now() - this.stats.startTime) / 1000).toFixed(2);
    
    console.log('\n🎉 Setup Completed Successfully!');
    console.log('================================');
    console.log(`⏱️  Total Time: ${duration}s`);
    console.log(`🗄️  Tables Created: ${this.stats.tablesCreated}`);
    console.log(`👥 Users Created: ${this.stats.usersCreated}`);
    console.log(`📋 Issues Created: ${this.stats.issuesCreated}`);
    console.log(`📷 Media Files: ${this.stats.mediaCreated}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`⚠️  Warnings: ${this.stats.errors.length}`);
    }

    console.log('\n📱 Ready for Development!');
    console.log('========================');
    console.log('Admin Login: admin@naagrik.gov.in / Admin@123');
    console.log('Test Location: IIT Kharagpur (22.3149, 87.3105)');
    console.log('API Endpoint: http://localhost:3000/api');
  }

  printErrorSummary() {
    console.log('\n💥 Setup Failed!');
    console.log('================');
    
    if (this.stats.errors.length > 0) {
      console.log('\nErrors encountered:');
      this.stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.phase}: ${error.error}`);
      });
    }

    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure PostgreSQL is running and accessible');
    console.log('2. Check database connection configuration');
    console.log('3. Verify all required environment variables are set');
    console.log('4. For image issues, check Cloudinary configuration');
  }
}

// Command line argument parsing
const parseArguments = () => {
  const args = process.argv.slice(2);
  
  const options = {
    resetDatabase: true,
    seedData: true,
    seedImages: true,
    useRealImages: SCRIPT_CONFIG.DEFAULT_USE_REAL_IMAGES,
    verbose: true
  };

  for (const arg of args) {
    switch (arg) {
      case '--clean':
      case '-c':
        options.seedData = false;
        options.seedImages = false;
        break;
        
      case '--seed-only':
      case '-s':
        options.resetDatabase = false;
        break;
        
      case '--real-images':
      case '-r':
        options.useRealImages = true;
        break;
        
      case '--placeholder-images':
      case '-p':
        options.useRealImages = false;
        break;
        
      case '--no-images':
        options.seedImages = false;
        break;
        
      case '--quiet':
      case '-q':
        options.verbose = false;
        break;
        
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
};

const printHelp = () => {
  console.log(`
Naagrik Backend Setup Script
============================

Usage: node masterSetup.js [options]

Options:
  --clean, -c              Only reset database (no seeding)
  --seed-only, -s          Only seed data (don't reset tables)  
  --real-images, -r        Use real images from Cloudinary
  --placeholder-images, -p Use placeholder images only
  --no-images             Skip image seeding entirely
  --quiet, -q             Reduce output verbosity
  --help, -h              Show this help message

Examples:
  node masterSetup.js                    # Full setup with default images
  node masterSetup.js --real-images      # Full setup with Cloudinary images
  node masterSetup.js --clean            # Only reset database
  node masterSetup.js --seed-only        # Only add seed data
  node masterSetup.js --no-images        # Setup without any media files

Environment Variables:
  CLOUDINARY_CLOUD_NAME   # Required for real images
  CLOUDINARY_API_KEY      # Required for real images  
  CLOUDINARY_API_SECRET   # Required for real images
`);
};

// Main execution
if (require.main === module) {
  const options = parseArguments();
  const setup = new MasterSetup(options);
  
  setup.run()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal Error:', error.message);
      process.exit(1);
    });
}

module.exports = MasterSetup;
