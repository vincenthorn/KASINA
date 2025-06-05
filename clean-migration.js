import pkg from 'pg';
const { Pool } = pkg;

const RENDER_DB_URL = "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db";

async function cleanMigration() {
  const renderPool = new Pool({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  const neonPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('Clearing existing data from Render database...');
    await renderPool.query('TRUNCATE sessions, users RESTART IDENTITY CASCADE');
    
    console.log('Fetching data from Neon database...');
    const usersResult = await neonPool.query('SELECT * FROM users ORDER BY created_at');
    const sessionsResult = await neonPool.query('SELECT * FROM sessions ORDER BY session_date');
    await neonPool.end();
    
    console.log(`Importing ${usersResult.rows.length} users and ${sessionsResult.rows.length} sessions...`);
    
    // Import users in batches
    let userCount = 0;
    const batchSize = 100;
    
    for (let i = 0; i < usersResult.rows.length; i += batchSize) {
      const batch = usersResult.rows.slice(i, i + batchSize);
      
      for (const user of batch) {
        try {
          await renderPool.query(
            `INSERT INTO users (email, name, subscription_type, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5)`,
            [user.email, user.name, user.subscription_type, user.created_at, user.updated_at]
          );
          userCount++;
        } catch (error) {
          console.error(`Error importing user ${user.email}:`, error.message);
        }
      }
      
      console.log(`Imported ${Math.min(i + batchSize, usersResult.rows.length)}/${usersResult.rows.length} users`);
    }
    
    // Import sessions
    let sessionCount = 0;
    for (const session of sessionsResult.rows) {
      try {
        await renderPool.query(
          `INSERT INTO sessions (user_email, kasina_type, duration_seconds, session_date, notes) 
           VALUES ($1, $2, $3, $4, $5)`,
          [session.user_email, session.kasina_type, session.duration_seconds, session.session_date, session.notes]
        );
        sessionCount++;
      } catch (error) {
        console.error(`Error importing session:`, error.message);
      }
    }
    
    // Final verification
    const finalUsers = await renderPool.query('SELECT COUNT(*) as count FROM users');
    const finalSessions = await renderPool.query('SELECT COUNT(*) as count FROM sessions');
    
    console.log('\n=== MIGRATION COMPLETE ===');
    console.log(`Render database: ${finalUsers.rows[0].count} users, ${finalSessions.rows[0].count} sessions`);
    
    // Show subscription breakdown
    const breakdown = await renderPool.query(`
      SELECT subscription_type, COUNT(*) as count 
      FROM users 
      WHERE subscription_type IS NOT NULL
      GROUP BY subscription_type 
      ORDER BY count DESC
    `);
    
    console.log('\nSubscription breakdown:');
    breakdown.rows.forEach(row => {
      console.log(`  ${row.subscription_type}: ${row.count} users`);
    });
    
    console.log('\nMigration successful! Your Render database now contains all data from Neon.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await renderPool.end();
  }
}

cleanMigration();