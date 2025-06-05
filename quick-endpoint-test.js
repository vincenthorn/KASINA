// Quick test to simulate the exact admin dashboard call
import pkg from 'pg';
const { Pool } = pkg;

const RENDER_DB_URL = "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db";

async function quickTest() {
  const pool = new Pool({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Simulate exact emergency endpoint query
    const usersQuery = 'SELECT email, subscription_type, created_at FROM users ORDER BY created_at DESC';
    const sessionsQuery = 'SELECT user_email, duration_seconds FROM sessions WHERE duration_seconds > 0';
    
    const [usersResult, sessionsResult] = await Promise.all([
      pool.query(usersQuery),
      pool.query(sessionsQuery)
    ]);
    
    const users = usersResult.rows;
    const sessions = sessionsResult.rows;
    
    console.log(`Users: ${users.length}, Sessions: ${sessions.length}`);
    
    // Test status assignment
    const members = users.map(user => {
      let status = "Freemium";
      if (user.email === 'admin@kasina.app') {
        status = "Admin";
      } else if (user.subscription_type === 'premium') {
        status = "Premium";
      }
      
      return {
        email: user.email,
        status,
        subscription_type: user.subscription_type
      };
    });
    
    // Final counts
    const response = {
      totalUsers: members.length,
      freemiumUsers: members.filter(m => m.status === 'Freemium').length,
      premiumUsers: members.filter(m => m.status === 'Premium').length,
      adminUsers: members.filter(m => m.status === 'Admin').length
    };
    
    console.log('Response that should be sent to admin dashboard:');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await pool.end();
  }
}

quickTest();