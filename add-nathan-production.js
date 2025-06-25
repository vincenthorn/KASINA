#!/usr/bin/env node

import { Pool } from 'pg';

async function addNathanToProduction() {
  // Use production database connection string
  const productionDbUrl = 'postgresql://kasina_render_user:0lsJUAFoFUHLWcEOaTajUv7LnZIQNxaY@dpg-ctudqqaj1k6c73dh5080-a.oregon-postgres.render.com/kasina_render';
  
  const pool = new Pool({
    connectionString: productionDbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Adding nathan@nathanvansynder.com to production database...');
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT email, subscription_type FROM users WHERE email = $1',
      ['nathan@nathanvansynder.com']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('User already exists, updating subscription type...');
      await pool.query(
        'UPDATE users SET subscription_type = $1, updated_at = NOW() WHERE email = $2',
        ['friend', 'nathan@nathanvansynder.com']
      );
    } else {
      console.log('Creating new user...');
      await pool.query(
        'INSERT INTO users (email, subscription_type, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
        ['nathan@nathanvansynder.com', 'friend']
      );
    }
    
    // Verify the user was added/updated
    const result = await pool.query(
      'SELECT email, subscription_type, created_at FROM users WHERE email = $1',
      ['nathan@nathanvansynder.com']
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('SUCCESS: Nathan added to production database');
      console.log(`Email: ${user.email}`);
      console.log(`Subscription: ${user.subscription_type}`);
      console.log(`Created: ${user.created_at}`);
    } else {
      console.log('ERROR: User not found after insertion');
    }
    
  } catch (error) {
    console.error('Error adding user to production:', error.message);
  } finally {
    await pool.end();
  }
}

addNathanToProduction();