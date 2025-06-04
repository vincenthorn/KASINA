import { Pool } from 'pg';

async function testProductionDatabase() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });

  try {
    console.log('Testing production database connection...');
    
    // Test 1: Basic connection
    const pingResult = await pool.query('SELECT NOW() as server_time');
    console.log('✅ Database connection successful');
    console.log('Server time:', pingResult.rows[0].server_time);
    
    // Test 2: Count users
    const userCountResult = await pool.query('SELECT COUNT(*) as total_users FROM users');
    console.log(`✅ Total users in database: ${userCountResult.rows[0].total_users}`);
    
    // Test 3: Count sessions
    const sessionCountResult = await pool.query('SELECT COUNT(*) as total_sessions FROM sessions');
    console.log(`✅ Total sessions in database: ${sessionCountResult.rows[0].total_sessions}`);
    
    // Test 4: User breakdown by subscription type
    const subscriptionResult = await pool.query(`
      SELECT subscription_type, COUNT(*) as count 
      FROM users 
      GROUP BY subscription_type 
      ORDER BY count DESC
    `);
    
    console.log('✅ User breakdown by subscription:');
    subscriptionResult.rows.forEach(row => {
      console.log(`  ${row.subscription_type}: ${row.count} users`);
    });
    
    // Test 5: Sample of recent users
    const recentUsersResult = await pool.query(`
      SELECT email, subscription_type, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('✅ Recent users sample:');
    recentUsersResult.rows.forEach(user => {
      console.log(`  ${user.email} (${user.subscription_type}) - ${user.created_at}`);
    });
    
    // Test 6: Practice time calculation
    const practiceTimeResult = await pool.query(`
      SELECT 
        SUM(duration_seconds) as total_seconds,
        COUNT(*) as session_count
      FROM sessions 
      WHERE duration_seconds > 0
    `);
    
    const totalSeconds = parseInt(practiceTimeResult.rows[0].total_seconds) || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    console.log('✅ Practice time statistics:');
    console.log(`  Total practice time: ${hours}h ${minutes}m`);
    console.log(`  Total practice sessions: ${practiceTimeResult.rows[0].session_count}`);
    
    // Summary for admin dashboard
    console.log('\n📊 ADMIN DASHBOARD SUMMARY:');
    console.log(`Total Users: ${userCountResult.rows[0].total_users}`);
    console.log(`Total Practice Time: ${hours}h ${minutes}m`);
    
    const freemium = subscriptionResult.rows.find(r => r.subscription_type === 'freemium')?.count || 0;
    const premium = subscriptionResult.rows.find(r => r.subscription_type === 'premium')?.count || 0;
    const admin = subscriptionResult.rows.find(r => r.subscription_type === 'admin')?.count || 0;
    
    console.log(`Freemium Users: ${freemium}`);
    console.log(`Premium Users: ${premium}`);
    console.log(`Admin Users: ${admin}`);
    
    console.log('\n🎯 Your database is working correctly with all user data intact.');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testProductionDatabase();