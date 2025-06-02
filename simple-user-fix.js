import { Pool } from 'pg';

async function quickUserFix() {
  const renderDb = new Pool({
    connectionString: "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db",
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Insert just the key test users
    await renderDb.query('DELETE FROM users');
    
    await renderDb.query(`
      INSERT INTO users (id, email, is_whitelisted, created_at) VALUES 
      (1, 'admin@kasina.app', true, CURRENT_TIMESTAMP),
      (2, 'user@kasina.app', true, CURRENT_TIMESTAMP)
    `);
    
    console.log('✅ Key users added successfully');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await renderDb.end();
  }
}

quickUserFix();