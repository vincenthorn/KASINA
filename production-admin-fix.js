import { Pool } from 'pg';

// Direct production admin dashboard fix
async function createProductionAdminEndpoint() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });

  try {
    console.log('Creating production-compatible admin endpoint...');
    
    // Production query that works with current schema
    const result = await pool.query(`
      SELECT 
         u.id,
         u.email,
         u.name,
         u.subscription_type,
         u.created_at,
         u.updated_at,
         COALESCE(SUM(s.duration_seconds), 0) as total_practice_seconds,
         COALESCE(COUNT(s.id), 0) as total_sessions
       FROM users u
       LEFT JOIN sessions s ON LOWER(u.email) = LOWER(s.user_email)
       GROUP BY u.id, u.email, u.name, u.subscription_type, u.created_at, u.updated_at
       ORDER BY u.created_at DESC
    `);

    const usersWithStats = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name || "",
      subscription_type: row.subscription_type,
      created_at: row.created_at,
      updated_at: row.updated_at,
      practiceStats: {
        totalSeconds: parseInt(row.total_practice_seconds),
        sessionCount: parseInt(row.total_sessions)
      }
    }));

    const totalPracticeTimeSeconds = usersWithStats.reduce((total, user) => {
      return total + user.practiceStats.totalSeconds;
    }, 0);

    const totalHours = Math.floor(totalPracticeTimeSeconds / 3600);
    const totalMinutes = Math.floor((totalPracticeTimeSeconds % 3600) / 60);
    const totalPracticeTimeFormatted = `${totalHours}h ${totalMinutes}m`;

    const adminEmails = ["admin@kasina.app"];
    const members = usersWithStats.map(user => {
      const practiceHours = Math.floor(user.practiceStats.totalSeconds / 3600);
      const practiceMinutes = Math.floor((user.practiceStats.totalSeconds % 3600) / 60);
      const practiceTimeFormatted = `${practiceHours}h ${practiceMinutes}m`;
      
      let status = "Freemium";
      if (adminEmails.includes(user.email)) {
        status = "Admin";
      } else if (user.subscription_type === 'premium') {
        status = "Premium";
      }
      
      return {
        email: user.email,
        name: user.name || "",
        practiceTimeSeconds: user.practiceStats.totalSeconds,
        practiceTimeFormatted,
        status
      };
    });

    const response = {
      members,
      totalPracticeTimeFormatted,
      totalUsers: members.length,
      freemiumUsers: members.filter(m => m.status === "Freemium").length,
      premiumUsers: members.filter(m => m.status === "Premium").length,
      adminUsers: members.filter(m => m.status === "Admin").length
    };

    console.log(`Production fix successful: ${response.totalUsers} users`);
    console.log(`Breakdown: ${response.freemiumUsers} freemium, ${response.premiumUsers} premium, ${response.adminUsers} admin`);
    console.log(`Total practice time: ${response.totalPracticeTimeFormatted}`);
    
    return response;

  } catch (error) {
    console.error('Production fix failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createProductionAdminEndpoint();