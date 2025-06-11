#!/usr/bin/env node

import { Pool } from 'pg';

async function updateUserSubscriptions() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });

  try {
    console.log('🔄 Updating user subscription types...');
    
    // Update specific users from premium to friend status
    const updateResult = await pool.query(`
      UPDATE users 
      SET subscription_type = 'friend' 
      WHERE email IN ('emilywhorn@gmail.com', 'brian@terma.asia', 'ryan@ryanoelke.com', 'ksowocki@gmail.com')
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} users to friend status`);
    
    // Verify the current counts
    const countResult = await pool.query(`
      SELECT subscription_type, COUNT(*) as count 
      FROM users 
      GROUP BY subscription_type 
      ORDER BY subscription_type
    `);
    
    console.log('📊 Updated user counts:');
    countResult.rows.forEach(row => {
      console.log(`   ${row.subscription_type}: ${row.count}`);
    });
    
    console.log('🚀 Database update completed successfully');
    
  } catch (error) {
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateUserSubscriptions();