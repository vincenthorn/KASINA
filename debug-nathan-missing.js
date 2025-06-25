#!/usr/bin/env node

import { Pool } from 'pg';

async function debugNathanMissing() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Debugging why Nathan is missing from admin dashboard...');
    
    // Get the exact query used by emergency admin endpoint
    const usersQuery = 'SELECT email, subscription_type, created_at FROM users ORDER BY created_at DESC';
    const result = await pool.query(usersQuery);
    
    console.log(`Total users from query: ${result.rows.length}`);
    
    // Find Nathan in the query results
    const nathanIndex = result.rows.findIndex(user => 
      user.email.toLowerCase() === 'nathan@nathanvansynder.com'
    );
    
    if (nathanIndex !== -1) {
      const nathan = result.rows[nathanIndex];
      console.log(`Nathan found at index ${nathanIndex}:`);
      console.log(`  Email: ${nathan.email}`);
      console.log(`  Subscription: ${nathan.subscription_type}`);
      console.log(`  Created: ${nathan.created_at}`);
      
      // Check users around Nathan
      console.log('\nUsers around Nathan:');
      const start = Math.max(0, nathanIndex - 2);
      const end = Math.min(result.rows.length - 1, nathanIndex + 2);
      
      for (let i = start; i <= end; i++) {
        const user = result.rows[i];
        const marker = i === nathanIndex ? ' --> NATHAN' : '';
        console.log(`  ${i}: ${user.email} (${user.subscription_type})${marker}`);
      }
      
      // Simulate the emergency admin endpoint logic
      let status = "Freemium";
      if (nathan.email === 'admin@kasina.app') {
        status = "Admin";
      } else if (nathan.subscription_type === 'premium') {
        status = "Premium";
      } else if (nathan.subscription_type === 'friend') {
        status = "Friend";
      }
      
      console.log(`\nNathan's computed status: ${status}`);
      
    } else {
      console.log('Nathan NOT found in database query results');
    }
    
    // Count Friend users in query
    const friendUsers = result.rows.filter(user => user.subscription_type === 'friend');
    console.log(`\nFriend users in database: ${friendUsers.length}`);
    friendUsers.forEach((user, index) => {
      console.log(`  ${index + 1}: ${user.email} (created: ${user.created_at})`);
    });
    
  } catch (error) {
    console.error('Debug failed:', error.message);
  } finally {
    await pool.end();
  }
}

debugNathanMissing();