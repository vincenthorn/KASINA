#!/usr/bin/env node

import { Pool } from 'pg';

async function findNathan() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Searching for Nathan in production database...');
    
    // Direct search for Nathan
    const nathanQuery = await pool.query(
      "SELECT email, subscription_type, created_at FROM users WHERE LOWER(email) LIKE '%nathan%'"
    );
    
    console.log('Nathan search results:');
    nathanQuery.rows.forEach(user => {
      console.log(`  ${user.email} - ${user.subscription_type} - ${user.created_at}`);
    });
    
    // Get all Friend users to see who else is there
    const friendQuery = await pool.query(
      "SELECT email, subscription_type, created_at FROM users WHERE subscription_type = 'friend' ORDER BY created_at DESC"
    );
    
    console.log('\nAll Friend users:');
    friendQuery.rows.forEach(user => {
      console.log(`  ${user.email} - ${user.subscription_type} - ${user.created_at}`);
    });
    
    // Test the exact query used by emergency admin endpoint
    const emergencyQuery = 'SELECT email, subscription_type, created_at FROM users ORDER BY created_at DESC';
    const result = await pool.query(emergencyQuery);
    
    const nathanInResults = result.rows.find(user => 
      user.email.toLowerCase().includes('nathan')
    );
    
    if (nathanInResults) {
      console.log('\nNathan found in emergency admin query:');
      console.log(`  ${nathanInResults.email} - ${nathanInResults.subscription_type} - ${nathanInResults.created_at}`);
    } else {
      console.log('\nNathan NOT found in emergency admin query results');
    }
    
    console.log(`\nTotal users in emergency query: ${result.rows.length}`);
    console.log(`Total Friend users: ${result.rows.filter(u => u.subscription_type === 'friend').length}`);
    
  } catch (error) {
    console.error('Error finding Nathan:', error.message);
  } finally {
    await pool.end();
  }
}

findNathan();