import pkg from 'pg';
const { Pool } = pkg;

const RENDER_DB_URL = "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db";

async function testEmergencyEndpoint() {
  const pool = new Pool({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Simulate the exact query used by emergency endpoint
    const usersQuery = 'SELECT email, subscription_type, created_at FROM users ORDER BY created_at DESC';
    const sessionsQuery = 'SELECT user_email, duration_seconds FROM sessions WHERE duration_seconds > 0';
    
    const [usersResult, sessionsResult] = await Promise.all([
      pool.query(usersQuery),
      pool.query(sessionsQuery)
    ]);
    
    const users = usersResult.rows;
    const sessions = sessionsResult.rows;
    
    console.log(`Retrieved ${users.length} users and ${sessions.length} sessions`);
    
    // Test the status assignment logic
    const members = users.map(user => {
      const userSessions = sessions.filter(s => 
        s.user_email && s.user_email.toLowerCase() === user.email.toLowerCase()
      );
      const totalSeconds = userSessions.reduce((sum, s) => sum + (parseInt(s.duration_seconds) || 0), 0);
      
      // Apply the fixed logic
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
    
    // Count by status
    const freemiumUsers = members.filter(m => m.status === 'Freemium').length;
    const premiumUsers = members.filter(m => m.status === 'Premium').length;
    const adminUsers = members.filter(m => m.status === 'Admin').length;
    
    console.log('Emergency Endpoint Results:');
    console.log(`Total Users: ${members.length}`);
    console.log(`Freemium Users: ${freemiumUsers}`);
    console.log(`Premium Users: ${premiumUsers}`);
    console.log(`Admin Users: ${adminUsers}`);
    
    // Show some premium users as examples
    const premiumExamples = members.filter(m => m.status === 'Premium').slice(0, 3);
    console.log('Premium user examples:');
    premiumExamples.forEach(user => {
      console.log(`  ${user.email} (${user.subscription_type})`);
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await pool.end();
  }
}

testEmergencyEndpoint();