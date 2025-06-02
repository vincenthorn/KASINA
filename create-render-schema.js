import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function createSchema() {
  const renderDb = new Pool({
    connectionString: "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db",
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Creating schema in Render database...');

    // Create users table
    await renderDb.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        subscription_type VARCHAR(50) DEFAULT 'freemium',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sessions table
    await renderDb.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(255) PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    // Create kasina_breakdowns table
    await renderDb.query(`
      CREATE TABLE IF NOT EXISTS kasina_breakdowns (
        id SERIAL PRIMARY KEY,
        type VARCHAR(255),
        data JSON,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Schema created successfully');

  } catch (error) {
    console.error('❌ Schema creation failed:', error);
    throw error;
  } finally {
    await renderDb.end();
  }
}

createSchema();