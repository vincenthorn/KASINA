#!/usr/bin/env node

import { Pool } from 'pg';

async function forceNathanVisibility() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Forcing Nathan visibility in admin dashboard...');
    
    // First, verify Nathan exists
    const nathanCheck = await pool.query(
      "SELECT id, email, subscription_type, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1)",
      ['nathan@nathanvansynder.com']
    );
    
    if (nathanCheck.rows.length === 0) {
      console.log('Nathan not found in database');
      return false;
    }
    
    const nathan = nathanCheck.rows[0];
    console.log('Current Nathan data:');
    console.log(`  ID: ${nathan.id}`);
    console.log(`  Email: ${nathan.email}`);
    console.log(`  Subscription: ${nathan.subscription_type}`);
    console.log(`  Created: ${nathan.created_at}`);
    console.log(`  Updated: ${nathan.updated_at}`);
    
    // Update Nathan's updated_at timestamp to force refresh
    console.log('\nUpdating Nathan to force admin dashboard refresh...');
    await pool.query(
      "UPDATE users SET updated_at = NOW() WHERE id = $1",
      [nathan.id]
    );
    
    // Verify the update
    const updatedNathan = await pool.query(
      "SELECT email, subscription_type, created_at, updated_at FROM users WHERE id = $1",
      [nathan.id]
    );
    
    if (updatedNathan.rows.length > 0) {
      const updated = updatedNathan.rows[0];
      console.log('\nNathan updated successfully:');
      console.log(`  Email: ${updated.email}`);
      console.log(`  Subscription: ${updated.subscription_type}`);
      console.log(`  Created: ${updated.created_at}`);
      console.log(`  Updated: ${updated.updated_at}`);
      
      // Also ensure Nathan is the most recent user by checking position
      const recentUsers = await pool.query(
        "SELECT email, subscription_type FROM users ORDER BY updated_at DESC LIMIT 5"
      );
      
      console.log('\nTop 5 most recently updated users:');
      recentUsers.rows.forEach((user, index) => {
        const marker = user.email === 'nathan@nathanvansynder.com' ? ' <-- NATHAN' : '';
        console.log(`  ${index + 1}: ${user.email} (${user.subscription_type})${marker}`);
      });
      
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('Error forcing Nathan visibility:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

forceNathanVisibility();