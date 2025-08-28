const { closePool } = require('../config/database');

module.exports = async () => {
  console.log('🔒 Closing database connections...');
  await closePool();
  console.log('✅ Database connections closed');
};
