import pkg from 'pg';
const { Pool } = pkg;

const RENDER_DB_URL = "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db";

async function fixMigration() {
  const renderPool = new Pool({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Check Render database schema
    console.log('Checking Render database schema...');
    const userColumns = await renderPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('Users table columns in Render:');
    userColumns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    const sessionColumns = await renderPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sessions'
      ORDER BY ordinal_position
    `);
    
    console.log('\nSessions table columns in Render:');
    sessionColumns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    // Now migrate with correct schema
    const neonPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('\nFetching data from Neon...');
    const usersResult = await neonPool.query('SELECT * FROM users ORDER BY created_at');
    const sessionsResult = await neonPool.query('SELECT * FROM sessions ORDER BY session_date');
    await neonPool.end();
    
    console.log(`Migrating ${usersResult.rows.length} users and ${sessionsResult.rows.length} sessions...`);
    
    // Import users (without name column)
    let userCount = 0;
    for (const user of usersResult.rows) {
      try {
        const result = await renderPool.query(
          `INSERT INTO users (email, subscription_type, created_at, updated_at) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (email) DO NOTHING
           RETURNING id`,
          [user.email, user.subscription_type, user.created_at, user.updated_at]
        );
        
        if (result.rows.length > 0) {
          userCount++;
        }
      } catch (error) {
        console.error(`Error importing user ${user.email}:`, error.message);
      }
    }
    
    console.log(`Imported ${userCount} users`);
    
    // Import sessions (check what columns exist)
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
    
    console.log(`Imported ${sessionCount} sessions`);
    
    // Final verification
    const finalUsers = await renderPool.query('SELECT COUNT(*) as count FROM users');
    const finalSessions = await renderPool.query('SELECT COUNT(*) as count FROM sessions');
    
    console.log('\n=== MIGRATION COMPLETE ===');
    console.log(`Final Render database: ${finalUsers.rows[0].count} users, ${finalSessions.rows[0].count} sessions`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await renderPool.end();
  }
}

fixMigration();