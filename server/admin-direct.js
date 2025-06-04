import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

// Direct admin server that bypasses the main application
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Working admin endpoint that uses simple queries
app.get('/admin-data', async (req, res) => {
  try {
    console.log('Direct admin access requested');
    
    // Use basic queries that work with production schema
    const usersQuery = 'SELECT email, subscription_type, created_at FROM users ORDER BY created_at DESC';
    const sessionsQuery = 'SELECT user_email, duration_seconds FROM sessions WHERE duration_seconds > 0';
    
    const [usersResult, sessionsResult] = await Promise.all([
      dbPool.query(usersQuery),
      dbPool.query(sessionsQuery)
    ]);
    
    const users = usersResult.rows;
    const sessions = sessionsResult.rows;
    
    // Process data in JavaScript to avoid SQL join issues
    const members = users.map(user => {
      const userSessions = sessions.filter(s => 
        s.user_email && s.user_email.toLowerCase() === user.email.toLowerCase()
      );
      const totalSeconds = userSessions.reduce((sum, s) => sum + (parseInt(s.duration_seconds) || 0), 0);
      
      return {
        email: user.email,
        name: "",
        practiceTimeSeconds: totalSeconds,
        practiceTimeFormatted: `${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60)}m`,
        status: user.email === 'admin@kasina.app' ? 'Admin' : 
               (user.subscription_type === 'premium' ? 'Premium' : 'Freemium')
      };
    });
    
    const totalPracticeTime = members.reduce((sum, member) => sum + member.practiceTimeSeconds, 0);
    const totalHours = Math.floor(totalPracticeTime / 3600);
    const totalMinutes = Math.floor((totalPracticeTime % 3600) / 60);
    
    const response = {
      members,
      totalPracticeTimeFormatted: `${totalHours}h ${totalMinutes}m`,
      totalUsers: members.length,
      freemiumUsers: members.filter(m => m.status === 'Freemium').length,
      premiumUsers: members.filter(m => m.status === 'Premium').length,
      adminUsers: members.filter(m => m.status === 'Admin').length,
      timestamp: new Date().toISOString()
    };
    
    console.log(`Successfully returned ${response.totalUsers} users`);
    res.json(response);
    
  } catch (error) {
    console.error('Direct admin error:', error);
    res.status(500).json({ 
      message: "Direct admin access failed", 
      error: error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'direct-admin' });
});

app.listen(port, () => {
  console.log(`Direct admin server running on port ${port}`);
});

export default app;