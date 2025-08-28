#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Running Naagrik Backend Test Suite\n');

// Set test environment
process.env.NODE_ENV = 'test';

// Define test commands
const commands = {
  all: 'jest',
  coverage: 'jest --coverage',
  watch: 'jest --watch',
  verbose: 'jest --verbose',
  auth: 'jest auth.test.js',
  issues: 'jest issues.test.js',
  comments: 'jest comments.test.js',
  users: 'jest users.test.js',
  stewards: 'jest stewards.test.js',
  upload: 'jest upload.test.js',
  health: 'jest health.test.js'
};

// Get command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';

if (!commands[testType]) {
  console.log('❌ Invalid test type. Available options:');
  Object.keys(commands).forEach(key => {
    console.log(`   ${key}`);
  });
  process.exit(1);
}

console.log(`🚀 Running ${testType} tests...\n`);

// Run the command
const command = commands[testType];
const [cmd, ...cmdArgs] = command.split(' ');

const testProcess = spawn(cmd, cmdArgs, {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Tests completed successfully!');
  } else {
    console.log('\n❌ Tests failed!');
  }
  process.exit(code);
});

testProcess.on('error', (err) => {
  console.error('❌ Error running tests:', err);
  process.exit(1);
});
