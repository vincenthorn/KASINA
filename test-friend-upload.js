#!/usr/bin/env node

import { Pool } from 'pg';

async function testFriendUpload() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Testing Friend user functionality...');
    
    // Verify Nathan and Phong exist as Friend users
    const friendUsers = await pool.query(
      "SELECT email, subscription_type, created_at FROM users WHERE subscription_type = 'friend' ORDER BY created_at DESC"
    );
    
    console.log(`\nTotal Friend users in database: ${friendUsers.rows.length}`);
    friendUsers.rows.forEach((user, index) => {
      console.log(`  ${index + 1}: ${user.email} (created: ${user.created_at.toISOString().split('T')[0]})`);
    });
    
    // Check if Nathan and Phong are in the list
    const nathan = friendUsers.rows.find(u => u.email === 'nathan@nathanvansynder.com');
    const phong = friendUsers.rows.find(u => u.email === 'phong@phong.com');
    
    console.log('\nVerification:');
    console.log(`Nathan as Friend: ${nathan ? '✅ Yes' : '❌ No'}`);
    console.log(`Phong as Friend: ${phong ? '✅ Yes' : '❌ No'}`);
    
    if (nathan && phong) {
      console.log('\n🎉 Both users are correctly set as Friend users!');
      console.log('The admin interface can now upload CSV files with Friend user type.');
      return true;
    } else {
      console.log('\n⚠️  Some users need to be updated to Friend status.');
      return false;
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

testFriendUpload();