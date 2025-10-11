import dotenv from 'dotenv';
import { Database } from './database/connection';

dotenv.config();

/**
 * Main entry point - can be used for testing database connection
 */
async function main() {
  console.log('=== Crypto Pachinko System ===');
  console.log('Testing database connection...');

  try {
    const db = Database.getInstance();
    const pool = db.getPool();

    // Test connection
    const connection = await pool.getConnection();
    console.log('✓ Database connection successful');
    connection.release();

    // Test query
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    console.log('✓ Database query successful:', rows);

    await db.close();
    console.log('✓ Database connection closed');

    console.log('\nSystem ready!');
    console.log('\nTo run the price collector:');
    console.log('  npm run price-collector');
    console.log('  npm run price-collector -- --historical  (to insert historical data first)');
    console.log('\nTo run the trading bot:');
    console.log('  npm run trading-bot');
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    console.error('\nMake sure the MySQL container is running.');
    console.error('If using devcontainer, the database should start automatically.');
    process.exit(1);
  }
}

main();
