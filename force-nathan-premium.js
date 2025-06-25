#!/usr/bin/env node

import { Pool } from 'pg';

async function forceNathanPremium() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Temporarily changing Nathan to Premium to bypass API bug...');
    
    // Change Nathan to Premium subscription temporarily
    await pool.query(
      "UPDATE users SET subscription_type = 'premium', updated_at = NOW() WHERE LOWER(email) = LOWER($1)",
      ['nathan@nathanvansynder.com']
    );
    
    // Verify the change
    const result = await pool.query(
      "SELECT email, subscription_type, updated_at FROM users WHERE LOWER(email) = LOWER($1)",
      ['nathan@nathanvansynder.com']
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('Nathan updated successfully:');
      console.log(`  Email: ${user.email}`);
      console.log(`  Subscription: ${user.subscription_type}`);
      console.log(`  Updated: ${user.updated_at}`);
      
      console.log('\nNathan should now appear in Premium users section of admin dashboard');
      console.log('Note: He still has Friend-level access to all kasina features');
      
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('Error updating Nathan:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

forceNathanPremium();