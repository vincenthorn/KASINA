#!/usr/bin/env node

import { Pool } from 'pg';

async function updatePhongToFriend() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Updating phong@phong.com from Freemium to Friend...');
    
    // First, check if Phong exists
    const userCheck = await pool.query(
      "SELECT id, email, subscription_type, created_at FROM users WHERE LOWER(email) = LOWER($1)",
      ['phong@phong.com']
    );
    
    if (userCheck.rows.length === 0) {
      console.log('User phong@phong.com not found in database');
      return false;
    }
    
    const user = userCheck.rows[0];
    console.log('Current user data:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Current subscription: ${user.subscription_type}`);
    console.log(`  Created: ${user.created_at}`);
    
    // Update subscription type to 'friend'
    const updateResult = await pool.query(
      "UPDATE users SET subscription_type = 'friend', updated_at = NOW() WHERE id = $1 RETURNING *",
      [user.id]
    );
    
    if (updateResult.rows.length > 0) {
      const updatedUser = updateResult.rows[0];
      console.log('\nUser updated successfully:');
      console.log(`  Email: ${updatedUser.email}`);
      console.log(`  New subscription: ${updatedUser.subscription_type}`);
      console.log(`  Updated at: ${updatedUser.updated_at}`);
      
      // Get updated Friend user count
      const friendCount = await pool.query(
        "SELECT COUNT(*) as count FROM users WHERE subscription_type = 'friend'"
      );
      
      console.log(`\nTotal Friend users in database: ${friendCount.rows[0].count}`);
      
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('Error updating user:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

updatePhongToFriend();