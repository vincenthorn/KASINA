#!/usr/bin/env node

import { Pool } from 'pg';

async function fixNathanFriendStatus() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Fixing Nathan back to Friend status...');
    
    // Update Nathan back to friend status
    const updateResult = await pool.query(
      "UPDATE users SET subscription_type = 'friend', updated_at = NOW() WHERE LOWER(email) = LOWER($1) RETURNING *",
      ['nathan@nathanvansynder.com']
    );
    
    if (updateResult.rows.length > 0) {
      const nathan = updateResult.rows[0];
      console.log('Nathan updated successfully:');
      console.log(`  Email: ${nathan.email}`);
      console.log(`  Subscription: ${nathan.subscription_type}`);
      console.log(`  Updated: ${nathan.updated_at}`);
      
      // Verify final Friend user count
      const friendCount = await pool.query(
        "SELECT COUNT(*) as count FROM users WHERE subscription_type = 'friend'"
      );
      
      console.log(`\nTotal Friend users: ${friendCount.rows[0].count}`);
      
      // List all Friend users
      const friendUsers = await pool.query(
        "SELECT email FROM users WHERE subscription_type = 'friend' ORDER BY email"
      );
      
      console.log('\nAll Friend users:');
      friendUsers.rows.forEach((user, index) => {
        console.log(`  ${index + 1}: ${user.email}`);
      });
      
      return true;
    }
    
    console.log('Nathan not found in database');
    return false;
    
  } catch (error) {
    console.error('Error fixing Nathan status:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

fixNathanFriendStatus();