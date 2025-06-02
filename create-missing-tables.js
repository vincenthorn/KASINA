import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function createMissingTables() {
  const renderDb = new Pool({
    connectionString: "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db",
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Creating missing meditation sessions tables...');

    // Drop existing sessions table if it exists (it's currently for auth sessions)
    await renderDb.query('DROP TABLE IF EXISTS sessions');

    // Create meditation sessions table
    await renderDb.query(`
      CREATE TABLE sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        kasina_type TEXT NOT NULL,
        kasina_name TEXT NOT NULL,
        duration INTEGER NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Update kasina_breakdowns to reference sessions
    await renderDb.query('DROP TABLE IF EXISTS kasina_breakdowns');
    await renderDb.query(`
      CREATE TABLE kasina_breakdowns (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES sessions(id),
        kasina_type TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create community_videos table
    await renderDb.query(`
      CREATE TABLE IF NOT EXISTS community_videos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT,
        youtube_url TEXT NOT NULL,
        embed_id TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Update users table to match schema
    await renderDb.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS name,
      DROP COLUMN IF EXISTS subscription_type,
      DROP COLUMN IF EXISTS updated_at
    `);

    await renderDb.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_whitelisted BOOLEAN DEFAULT false
    `);

    console.log('✅ Missing tables created successfully');

  } catch (error) {
    console.error('❌ Table creation failed:', error);
    throw error;
  } finally {
    await renderDb.end();
  }
}

createMissingTables();