import pkg from 'pg';
import fs from 'fs';
const { Pool } = pkg;

const RENDER_DB_URL = "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db";

async function importToRender() {
  const renderPool = new Pool({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('Starting migration to Render database...');
    
    // Check current state
    const currentUsers = await renderPool.query('SELECT COUNT(*) as count FROM users');
    const currentSessions = await renderPool.query('SELECT COUNT(*) as count FROM sessions');
    console.log(`Current Render database: ${currentUsers.rows[0].count} users, ${currentSessions.rows[0].count} sessions`);
    
    // Export fresh data from Neon
    const neonPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('Fetching data from Neon...');
    const usersResult = await neonPool.query('SELECT * FROM users ORDER BY created_at');
    const sessionsResult = await neonPool.query('SELECT * FROM sessions ORDER BY session_date');
    await neonPool.end();
    
    console.log(`Migrating ${usersResult.rows.length} users and ${sessionsResult.rows.length} sessions...`);
    
    // Import users
    let userCount = 0;
    let userDuplicates = 0;
    
    for (const user of usersResult.rows) {
      try {
        const result = await renderPool.query(
          `INSERT INTO users (email, name, subscription_type, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT (email) DO NOTHING
           RETURNING id`,
          [user.email, user.name, user.subscription_type, user.created_at, user.updated_at]
        );
        
        if (result.rows.length > 0) {
          userCount++;
        } else {
          userDuplicates++;
        }
      } catch (error) {
        console.error(`Error importing user ${user.email}:`, error.message);
      }
    }
    
    console.log(`Users: ${userCount} imported, ${userDuplicates} duplicates`);
    
    // Import sessions
    let sessionCount = 0;
    let sessionDuplicates = 0;
    
    for (const session of sessionsResult.rows) {
      try {
        const result = await renderPool.query(
          `INSERT INTO sessions (user_email, kasina_type, duration_seconds, session_date, notes) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT (user_email, session_date) DO NOTHING
           RETURNING id`,
          [session.user_email, session.kasina_type, session.duration_seconds, session.session_date, session.notes]
        );
        
        if (result.rows.length > 0) {
          sessionCount++;
        } else {
          sessionDuplicates++;
        }
      } catch (error) {
        console.error(`Error importing session:`, error.message);
      }
    }
    
    console.log(`Sessions: ${sessionCount} imported, ${sessionDuplicates} duplicates`);
    
    // Final verification
    const finalUsers = await renderPool.query('SELECT COUNT(*) as count FROM users');
    const finalSessions = await renderPool.query('SELECT COUNT(*) as count FROM sessions');
    
    console.log('\n=== MIGRATION COMPLETE ===');
    console.log(`Final Render database: ${finalUsers.rows[0].count} users, ${finalSessions.rows[0].count} sessions`);
    
    // Show sample data
    const sampleUsers = await renderPool.query('SELECT email, subscription_type FROM users ORDER BY created_at DESC LIMIT 5');
    console.log('\nSample users in Render database:');
    sampleUsers.rows.forEach(user => {
      console.log(`  ${user.email} (${user.subscription_type})`);
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await renderPool.end();
  }
}

importToRender();