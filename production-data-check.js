import pkg from 'pg';
const { Pool } = pkg;

// Connect to production database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkProductionData() {
  try {
    console.log('Checking production database...');
    
    // Check user count
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`Users in production: ${userCount.rows[0].count}`);
    
    // Check sample users
    const sampleUsers = await pool.query('SELECT email, subscription_type FROM users ORDER BY created_at DESC LIMIT 10');
    console.log('Sample users:');
    sampleUsers.rows.forEach(user => {
      console.log(`  ${user.email} (${user.subscription_type || 'undefined'})`);
    });
    
    // Check session count
    const sessionCount = await pool.query('SELECT COUNT(*) as count FROM sessions');
    console.log(`Sessions in production: ${sessionCount.rows[0].count}`);
    
  } catch (error) {
    console.error('Error checking production data:', error);
  } finally {
    await pool.end();
  }
}

checkProductionData();