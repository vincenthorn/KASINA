#!/usr/bin/env node

import { Pool } from 'pg';

async function testProductionDatabaseDirect() {
  // Try connecting to the actual production database URL that start.kasina.app uses
  const productionDbUrl = 'postgresql://kasina_render_user:0lsJUAFoFUHLWcEOaTajUv7LnZIQNxaY@dpg-ctudqqaj1k6c73dh5080-a.oregon-postgres.render.com/kasina_render';
  
  const pool = new Pool({
    connectionString: productionDbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Testing direct connection to production database...');
    
    // Check if Nathan exists in production database
    const nathanCheck = await pool.query(
      "SELECT email, subscription_type, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1)",
      ['nathan@nathanvansynder.com']
    );
    
    if (nathanCheck.rows.length > 0) {
      const nathan = nathanCheck.rows[0];
      console.log('Nathan found in PRODUCTION database:');
      console.log(`  Email: ${nathan.email}`);
      console.log(`  Subscription: ${nathan.subscription_type}`);
      console.log(`  Created: ${nathan.created_at}`);
      console.log(`  Updated: ${nathan.updated_at}`);
    } else {
      console.log('Nathan NOT found in production database');
      
      // Add Nathan to production database
      console.log('Adding Nathan to production database...');
      await pool.query(
        "INSERT INTO users (email, subscription_type, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (email) DO UPDATE SET subscription_type = $2, updated_at = NOW()",
        ['nathan@nathanvansynder.com', 'premium']
      );
      
      console.log('Nathan added to production database');
    }
    
    // Get user counts from production
    const userCounts = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN subscription_type = 'premium' THEN 1 END) as premium_users,
        COUNT(CASE WHEN subscription_type = 'friend' THEN 1 END) as friend_users,
        COUNT(CASE WHEN subscription_type = 'freemium' THEN 1 END) as freemium_users
      FROM users
    `);
    
    const counts = userCounts.rows[0];
    console.log('\nProduction database user counts:');
    console.log(`  Total: ${counts.total_users}`);
    console.log(`  Premium: ${counts.premium_users}`);
    console.log(`  Friend: ${counts.friend_users}`);
    console.log(`  Freemium: ${counts.freemium_users}`);
    
    // Verify Nathan again after potential insert
    const finalCheck = await pool.query(
      "SELECT email, subscription_type FROM users WHERE LOWER(email) = LOWER($1)",
      ['nathan@nathanvansynder.com']
    );
    
    if (finalCheck.rows.length > 0) {
      console.log(`\nFinal verification: Nathan exists as ${finalCheck.rows[0].subscription_type} user`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('Production database connection failed:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

testProductionDatabaseDirect();