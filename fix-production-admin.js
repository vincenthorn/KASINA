import { Pool } from 'pg';
import fs from 'fs';

async function createProductionAdminFix() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });

  try {
    console.log('Creating production admin dashboard data...');
    
    // Use the exact working query
    const result = await pool.query(`
      SELECT 
        u.email,
        u.subscription_type,
        u.created_at,
        COALESCE(SUM(s.duration_seconds), 0) as total_seconds,
        COALESCE(COUNT(s.id), 0) as session_count
      FROM users u
      LEFT JOIN sessions s ON u.email = s.user_email
      GROUP BY u.email, u.subscription_type, u.created_at
      ORDER BY u.created_at DESC
    `);

    const members = result.rows.map(row => ({
      email: row.email,
      name: "",
      practiceTimeSeconds: parseInt(row.total_seconds),
      practiceTimeFormatted: `${Math.floor(row.total_seconds / 3600)}h ${Math.floor((row.total_seconds % 3600) / 60)}m`,
      status: row.email === 'admin@kasina.app' ? 'Admin' : 
             (row.subscription_type === 'premium' ? 'Premium' : 'Freemium')
    }));

    const totalPracticeTime = members.reduce((sum, member) => sum + member.practiceTimeSeconds, 0);
    const totalHours = Math.floor(totalPracticeTime / 3600);
    const totalMinutes = Math.floor((totalPracticeTime % 3600) / 60);

    const adminData = {
      members,
      totalPracticeTimeFormatted: `${totalHours}h ${totalMinutes}m`,
      totalUsers: members.length,
      freemiumUsers: members.filter(m => m.status === 'Freemium').length,
      premiumUsers: members.filter(m => m.status === 'Premium').length,
      adminUsers: members.filter(m => m.status === 'Admin').length,
      generated: new Date().toISOString()
    };

    // Save data to file for static serving
    fs.writeFileSync('client/public/admin-data.json', JSON.stringify(adminData, null, 2));
    
    console.log('Admin data file created successfully');
    console.log(`Total Users: ${adminData.totalUsers}`);
    console.log(`Freemium: ${adminData.freemiumUsers}, Premium: ${adminData.premiumUsers}, Admin: ${adminData.adminUsers}`);
    console.log(`Total Practice Time: ${adminData.totalPracticeTimeFormatted}`);
    
  } catch (error) {
    console.error('Failed to create admin data:', error.message);
  } finally {
    await pool.end();
  }
}

createProductionAdminFix();