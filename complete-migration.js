import pkg from 'pg';
const { Pool } = pkg;

const NEON_DB_URL = "postgresql://neondb_owner:npg_YIuwM7vF6DVl@ep-empty-tooth-a65iyovg.us-west-2.aws.neon.tech/neondb";
const RENDER_DB_URL = "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db";

async function importToRender() {
  const neonPool = new Pool({
    connectionString: NEON_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  const renderPool = new Pool({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check current status
    const renderCount = await renderPool.query('SELECT COUNT(*) as count FROM users');
    const neonCount = await neonPool.query('SELECT COUNT(*) as count FROM users');
    
    console.log(`Current: ${renderCount.rows[0].count} users in Render, ${neonCount.rows[0].count} users in Neon`);
    
    // Get users that haven't been migrated yet
    const existingEmails = await renderPool.query('SELECT email FROM users');
    const existingEmailSet = new Set(existingEmails.rows.map(row => row.email));
    
    // Get remaining users from Neon in batches
    let offset = 0;
    const batchSize = 100;
    let totalMigrated = 0;
    
    while (true) {
      const users = await neonPool.query(`
        SELECT email, name, subscription_type, created_at, updated_at 
        FROM users 
        ORDER BY created_at 
        LIMIT $1 OFFSET $2
      `, [batchSize, offset]);
      
      if (users.rows.length === 0) break;
      
      // Filter out already migrated users
      const newUsers = users.rows.filter(user => !existingEmailSet.has(user.email));
      
      if (newUsers.length > 0) {
        // Insert new users
        for (const user of newUsers) {
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
            totalMigrated++;
            existingEmailSet.add(user.email);
          } catch (insertError) {
            console.error(`Error inserting user ${user.email}:`, insertError.message);
          }
        }
        
        console.log(`Migrated batch: ${newUsers.length} users (Total: ${totalMigrated})`);
      }
      
      offset += batchSize;
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Now migrate sessions
    console.log('Starting session migration...');
    const sessions = await neonPool.query('SELECT * FROM sessions');
    
    for (const session of sessions.rows) {
      try {
        await renderPool.query(`
          INSERT INTO sessions (
            user_email, kasina_type, duration_minutes, notes, 
            created_at, updated_at, user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `, [
          session.user_email,
          session.kasina_type,
          session.duration_minutes,
          session.notes,
          session.created_at,
          session.updated_at,
          session.user_id
        ]);
      } catch (sessionError) {
        console.error(`Error inserting session:`, sessionError.message);
      }
    }
    
    // Final count
    const finalCount = await renderPool.query('SELECT COUNT(*) as count FROM users');
    const finalSessions = await renderPool.query('SELECT COUNT(*) as count FROM sessions');
    
    console.log(`\nMigration Complete!`);
    console.log(`Total users in Render: ${finalCount.rows[0].count}`);
    console.log(`Total sessions in Render: ${finalSessions.rows[0].count}`);
    
    // Show subscription breakdown
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

importToRender();