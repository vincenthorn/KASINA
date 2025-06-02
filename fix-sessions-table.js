import { Pool } from 'pg';

async function fixSessionsTable() {
  const renderDb = new Pool({
    connectionString: "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db",
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Fixing sessions table schema...');

    // Drop dependent table first, then recreate everything
    await renderDb.query('DROP TABLE IF EXISTS kasina_breakdowns');
    await renderDb.query('DROP TABLE IF EXISTS sessions');
    
    await renderDb.query(`
      CREATE TABLE sessions (
        id SERIAL PRIMARY KEY,
        user_email TEXT NOT NULL,
        kasina_type TEXT NOT NULL,
        kasina_name TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        session_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Recreate kasina_breakdowns table
    await renderDb.query(`
      CREATE TABLE kasina_breakdowns (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES sessions(id),
        kasina_type TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Sessions table fixed with correct schema');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await renderDb.end();
  }
}

fixSessionsTable();