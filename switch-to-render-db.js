import pkg from 'pg';
const { Pool } = pkg;

const RENDER_DB_URL = "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db";

async function checkRenderDatabase() {
  const pool = new Pool({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const sessionCount = await pool.query('SELECT COUNT(*) as count FROM sessions');
    
    console.log(`Render database status:`);
    console.log(`Users: ${userCount.rows[0].count}`);
    console.log(`Sessions: ${sessionCount.rows[0].count}`);
    
    if (userCount.rows[0].count > 1000) {
      console.log('Migration appears successful!');
      
      // Show subscription breakdown
      const breakdown = await pool.query(`
        SELECT subscription_type, COUNT(*) as count 
        FROM users 
        WHERE subscription_type IS NOT NULL
        GROUP BY subscription_type 
        ORDER BY count DESC
      `);
      
      console.log('User breakdown:');
      breakdown.rows.forEach(row => {
        console.log(`  ${row.subscription_type}: ${row.count} users`);
      });
    }
    
  } catch (error) {
    console.error('Database check failed:', error);
  } finally {
    await pool.end();
  }
}

checkRenderDatabase();