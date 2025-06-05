import pkg from 'pg';
const { Pool } = pkg;

const NEON_DB_URL = "postgresql://neondb_owner:npg_YIuwM7vF6DVl@ep-empty-tooth-a65iyovg.us-west-2.aws.neon.tech/neondb";
const RENDER_DB_URL = "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db";

async function completeMigration() {
  const neonPool = new Pool({
    connectionString: NEON_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  const renderPool = new Pool({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Complete remaining users first
    const renderCount = await renderPool.query('SELECT COUNT(*) as count FROM users');
    console.log(`Current users in Render: ${renderCount.rows[0].count}`);
    
    // Get remaining users
    const existingEmails = await renderPool.query('SELECT email FROM users');
    const existingEmailSet = new Set(existingEmails.rows.map(row => row.email));
    
    const allUsers = await neonPool.query('SELECT email, name, subscription_type, created_at, updated_at FROM users');
    const remainingUsers = allUsers.rows.filter(user => !existingEmailSet.has(user.email));
    
    console.log(`Migrating final ${remainingUsers.length} users...`);
    
    for (const user of remainingUsers) {
      try {
        await renderPool.query(`
          INSERT INTO users (email, name, subscription_type, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (email) DO NOTHING
        `, [
          user.email,
          user.name,
          user.subscription_type,
          user.created_at,
          user.updated_at
        ]);
      } catch (error) {
        console.error(`Error inserting user ${user.email}:`, error.message);
      }
    }
    
    // Now migrate sessions with correct column names
    console.log('Migrating sessions...');
    const sessions = await neonPool.query('SELECT * FROM sessions');
    
    for (const session of sessions.rows) {
      try {
        await renderPool.query(`
          INSERT INTO sessions (
            user_email, kasina_type, duration_seconds, 
            created_at, kasina_name, session_date
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT DO NOTHING
        `, [
          session.user_email,
          session.kasina_type,
          session.duration_minutes ? session.duration_minutes * 60 : null, // Convert minutes to seconds
          session.created_at,
          session.kasina_type, // Use kasina_type for kasina_name if needed
          session.created_at // Use created_at as session_date
        ]);
      } catch (sessionError) {
        console.error(`Error inserting session:`, sessionError.message);
      }
    }
    
    // Final verification
    const finalUserCount = await renderPool.query('SELECT COUNT(*) as count FROM users');
    const finalSessionCount = await renderPool.query('SELECT COUNT(*) as count FROM sessions');
    
    console.log(`\nMIGRATION COMPLETE!`);
    console.log(`Total users: ${finalUserCount.rows[0].count}`);
    console.log(`Total sessions: ${finalSessionCount.rows[0].count}`);
    
    // Show breakdown
    const breakdown = await renderPool.query(`
      SELECT subscription_type, COUNT(*) as count 
      FROM users 
      WHERE subscription_type IS NOT NULL
      GROUP BY subscription_type 
      ORDER BY count DESC
    `);
    
    console.log('\nUser breakdown:');
    breakdown.rows.forEach(row => {
      console.log(`  ${row.subscription_type}: ${row.count} users`);
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await neonPool.end();
    await renderPool.end();
  }
}

completeMigration();