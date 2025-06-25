#!/usr/bin/env node

// Direct production database insertion using the same approach as successful imports
import { Pool } from 'pg';

async function addNathanDirectly() {
  // Use the same DATABASE_URL that production uses
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Connecting to production database...');
    
    // First verify we can connect and see current users
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`Current total users: ${userCount.rows[0].count}`);
    
    // Check if Nathan already exists
    const existingUser = await pool.query(
      'SELECT email, subscription_type FROM users WHERE LOWER(email) = LOWER($1)',
      ['nathan@nathanvansynder.com']
    );
    
    if (existingUser.rows.length > 0) {
      console.log(`Nathan already exists with subscription: ${existingUser.rows[0].subscription_type}`);
      // Update to friend if different
      if (existingUser.rows[0].subscription_type !== 'friend') {
        await pool.query(
          'UPDATE users SET subscription_type = $1, updated_at = NOW() WHERE LOWER(email) = LOWER($2)',
          ['friend', 'nathan@nathanvansynder.com']
        );
        console.log('Updated Nathan to friend subscription');
      }
    } else {
      console.log('Adding Nathan as new friend user...');
      await pool.query(
        'INSERT INTO users (email, subscription_type, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
        ['nathan@nathanvansynder.com', 'friend']
      );
      console.log('Nathan added successfully');
    }
    
    // Verify the final result
    const finalCheck = await pool.query(
      'SELECT email, subscription_type, created_at FROM users WHERE LOWER(email) = LOWER($1)',
      ['nathan@nathanvansynder.com']
    );
    
    if (finalCheck.rows.length > 0) {
      const user = finalCheck.rows[0];
      console.log('\nFINAL VERIFICATION:');
      console.log(`Email: ${user.email}`);
      console.log(`Subscription: ${user.subscription_type}`);
      console.log(`Created: ${user.created_at}`);
      
      // Show updated user count
      const newUserCount = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log(`\nTotal users now: ${newUserCount.rows[0].count}`);
      
      return true;
    } else {
      console.log('ERROR: Nathan not found after operation');
      return false;
    }
    
  } catch (error) {
    console.error('Database operation failed:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Export for potential reuse
export { addNathanDirectly };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addNathanDirectly()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}