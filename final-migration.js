import pkg from 'pg';
const { Pool } = pkg;

const RENDER_DB_URL = "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db";

async function completeMigration() {
  const renderPool = new Pool({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  const neonPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('Starting final migration...');
    
    // Get data from Neon
    const usersResult = await neonPool.query('SELECT * FROM users ORDER BY created_at');
    const sessionsResult = await neonPool.query('SELECT * FROM sessions ORDER BY session_date');
    await neonPool.end();
    
    console.log(`Migrating ${usersResult.rows.length} users and ${sessionsResult.rows.length} sessions...`);
    
    // Migrate users with correct schema
    let userCount = 0;
    for (const user of usersResult.rows) {
      try {
        const result = await renderPool.query(
          `INSERT INTO users (email, name, subscription_type, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           subscription_type = EXCLUDED.subscription_type,
           updated_at = EXCLUDED.updated_at
           RETURNING id`,
          [user.email, user.name, user.subscription_type, user.created_at, user.updated_at]
        );
        
        userCount++;
      } catch (error) {
        console.error(`Error importing user ${user.email}:`, error.message);
      }
    }
    
    console.log(`Migrated ${userCount} users`);
    
    // Migrate sessions
    let sessionCount = 0;
    for (const session of sessionsResult.rows) {
      try {
        const result = await renderPool.query(
          `INSERT INTO sessions (user_email, kasina_type, duration_seconds, session_date, notes) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [session.user_email, session.kasina_type, session.duration_seconds, session.session_date, session.notes]
        );
        
        if (result.rows.length > 0) {
          sessionCount++;
        }
      } catch (error) {
        console.error(`Error importing session:`, error.message);
      }
    }
    
    console.log(`Migrated ${sessionCount} sessions`);
    
    // Final verification
    const finalUsers = await renderPool.query('SELECT COUNT(*) as count FROM users');
    const finalSessions = await renderPool.query('SELECT COUNT(*) as count FROM sessions');
    
    console.log('\n=== MIGRATION COMPLETE ===');
    console.log(`Render database now contains: ${finalUsers.rows[0].count} users, ${finalSessions.rows[0].count} sessions`);
    
    // Show subscription breakdown
    const breakdown = await renderPool.query(`
      SELECT subscription_type, COUNT(*) as count 
      FROM users 
      GROUP BY subscription_type 
      ORDER BY count DESC
    `);
    
    console.log('\nUser breakdown by subscription:');
    breakdown.rows.forEach(row => {
      console.log(`  ${row.subscription_type}: ${row.count} users`);
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await renderPool.end();
  }
}

completeMigration();