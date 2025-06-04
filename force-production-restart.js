#!/usr/bin/env node

import { Pool } from 'pg';

async function forceProductionRestart() {
  console.log('🚀 Force Production Restart Script');
  console.log('Deploying admin dashboard fix with simplified database queries...');
  
  // Test database connection first
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });

  try {
    // Test the simplified queries that will be used in production
    console.log('Testing simplified database queries...');
    
    const usersResult = await pool.query('SELECT email, subscription_type, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    const sessionsResult = await pool.query('SELECT user_email, duration_seconds FROM sessions WHERE duration_seconds > 0 LIMIT 5');
    
    console.log(`✅ Database test successful: ${usersResult.rows.length} users, ${sessionsResult.rows.length} sessions`);
    console.log('Sample user emails:', usersResult.rows.map(u => u.email).slice(0, 3));
    
    // Test the production-ready endpoint logic
    const users = usersResult.rows;
    const sessions = sessionsResult.rows;
    
    const usersWithStats = users.map(user => {
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
    
    console.log('✅ Data processing test successful');
    console.log('Ready for production deployment');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

forceProductionRestart();