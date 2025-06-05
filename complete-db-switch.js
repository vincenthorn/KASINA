import pkg from 'pg';
const { Pool } = pkg;

const RENDER_DB_URL = "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db";

async function waitForMigrationComplete() {
  const pool = new Pool({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    let previousCount = 0;
    let stableCount = 0;
    
    while (stableCount < 3) {
      const result = await pool.query('SELECT COUNT(*) as count FROM users');
      const currentCount = parseInt(result.rows[0].count);
      
      console.log(`Current users in Render database: ${currentCount}`);
      
      if (currentCount === previousCount) {
        stableCount++;
      } else {
        stableCount = 0;
        previousCount = currentCount;
      }
      
      if (currentCount >= 1400) {
        console.log('Migration appears complete!');
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    }
    
    // Final verification
    const finalResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const sessionResult = await pool.query('SELECT COUNT(*) as count FROM sessions');
    
    console.log(`Final count: ${finalResult.rows[0].count} users, ${sessionResult.rows[0].count} sessions`);
    
    // Show breakdown
    const breakdown = await pool.query(`
      SELECT subscription_type, COUNT(*) as count 
      FROM users 
      WHERE subscription_type IS NOT NULL
      GROUP BY subscription_type 
      ORDER BY count DESC
    `);
    
    console.log('User subscription breakdown:');
    breakdown.rows.forEach(row => {
      console.log(`  ${row.subscription_type}: ${row.count} users`);
    });
    
    return finalResult.rows[0].count;
    
  } catch (error) {
    console.error('Database check failed:', error);
    return 0;
  } finally {
    await pool.end();
  }
}

waitForMigrationComplete();