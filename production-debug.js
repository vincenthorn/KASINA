// Production database diagnostic
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testProductionDatabase() {
  try {
    console.log('=== PRODUCTION DATABASE DIAGNOSTIC ===');
    
    // Test 1: Basic connection
    console.log('1. Testing database connection...');
    const connectionTest = await pool.query('SELECT NOW()');
    console.log('   Connection successful:', connectionTest.rows[0].now);
    
    // Test 2: User count
    console.log('2. Checking user count...');
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log('   Total users:', userCount.rows[0].count);
    
    // Test 3: Subscription breakdown
    console.log('3. Checking subscription types...');
    const subTypes = await pool.query(
      'SELECT subscription_type, COUNT(*) as count FROM users GROUP BY subscription_type ORDER BY count DESC'
    );
    console.log('   Subscription breakdown:');
    subTypes.rows.forEach(row => {
      console.log(`     ${row.subscription_type}: ${row.count}`);
    });
    
    // Test 4: Admin user verification
    console.log('4. Verifying admin user...');
    const adminUser = await pool.query(
      'SELECT email, subscription_type FROM users WHERE email = $1',
      ['admin@kasina.app']
    );
    if (adminUser.rows.length > 0) {
      console.log('   Admin user found:', adminUser.rows[0]);
    } else {
      console.log('   Admin user NOT found');
    }
    
    // Test 5: Complex query (same as getAllUsersWithStats)
    console.log('5. Testing complex query...');
    const complexQuery = await pool.query(`
      SELECT 
         u.*,
         COALESCE(SUM(s.duration_seconds), 0) as total_practice_seconds,
         COALESCE(COUNT(s.id), 0) as total_sessions
       FROM users u
       LEFT JOIN sessions s ON LOWER(u.email) = LOWER(s.user_email)
       GROUP BY u.id, u.email, u.name, u.subscription_type, u.created_at, u.updated_at
       ORDER BY u.created_at DESC
       LIMIT 5
    `);
    console.log('   Complex query returned:', complexQuery.rows.length, 'users');
    
    if (complexQuery.rows.length > 0) {
      console.log('   Sample result:');
      const sample = complexQuery.rows[0];
      console.log(`     Email: ${sample.email}`);
      console.log(`     Type: ${sample.subscription_type}`);
      console.log(`     Practice: ${sample.total_practice_seconds}s`);
      console.log(`     Sessions: ${sample.total_sessions}`);
    }
    
    console.log('=== DIAGNOSTIC COMPLETE ===');
    
  } catch (error) {
    console.error('Database diagnostic failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testProductionDatabase();