import fs from 'fs';
import { parse } from 'csv-parse';
import pkg from 'pg';
const { Pool } = pkg;

// Use production database URL from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function importUsersFromCSV(filePath, subscriptionType = 'freemium') {
  return new Promise((resolve, reject) => {
    const users = [];
    
    fs.createReadStream(filePath)
      .pipe(parse({ 
        headers: true, 
        skip_empty_lines: true,
        trim: true 
      }))
      .on('data', (data) => {
        const email = data.email?.trim().toLowerCase();
        if (email && email.includes('@')) {
          users.push({
            email: email,
            subscription_type: subscriptionType,
            name: data.name || '',
            created_at: new Date()
          });
        }
      })
      .on('end', () => {
        console.log(`Parsed ${users.length} users from ${filePath}`);
        resolve(users);
      })
      .on('error', reject);
  });
}

async function insertUsers(users) {
  const client = await pool.connect();
  try {
    let insertedCount = 0;
    let duplicateCount = 0;
    
    for (const user of users) {
      try {
        const result = await client.query(
          `INSERT INTO users (email, subscription_type, name, created_at) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (email) DO NOTHING 
           RETURNING id`,
          [user.email, user.subscription_type, user.name, user.created_at]
        );
        
        if (result.rows.length > 0) {
          insertedCount++;
        } else {
          duplicateCount++;
        }
      } catch (error) {
        console.error(`Error inserting user ${user.email}:`, error.message);
      }
    }
    
    console.log(`Inserted ${insertedCount} new users, skipped ${duplicateCount} duplicates`);
    return { insertedCount, duplicateCount };
  } finally {
    client.release();
  }
}

async function importAllUsers() {
  try {
    console.log('Starting production user import...');
    
    // Check current user count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`Current users in database: ${countResult.rows[0].count}`);
    
    let totalInserted = 0;
    let totalDuplicates = 0;
    
    // Import freemium users
    if (fs.existsSync('whitelist-freemium.csv')) {
      console.log('Importing freemium users...');
      const freemiumUsers = await importUsersFromCSV('whitelist-freemium.csv', 'freemium');
      const result = await insertUsers(freemiumUsers);
      totalInserted += result.insertedCount;
      totalDuplicates += result.duplicateCount;
    }
    
    // Import premium users
    if (fs.existsSync('whitelist-premium.csv')) {
      console.log('Importing premium users...');
      const premiumUsers = await importUsersFromCSV('whitelist-premium.csv', 'premium');
      const result = await insertUsers(premiumUsers);
      totalInserted += result.insertedCount;
      totalDuplicates += result.duplicateCount;
    }
    
    // Import main whitelist
    if (fs.existsSync('whitelist.csv')) {
      console.log('Importing main whitelist users...');
      const mainUsers = await importUsersFromCSV('whitelist.csv', 'freemium');
      const result = await insertUsers(mainUsers);
      totalInserted += result.insertedCount;
      totalDuplicates += result.duplicateCount;
    }
    
    // Final count
    const finalCountResult = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`Final users in database: ${finalCountResult.rows[0].count}`);
    console.log(`Total new users imported: ${totalInserted}`);
    console.log(`Total duplicates skipped: ${totalDuplicates}`);
    
    console.log('Production user import completed successfully!');
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the import
importAllUsers();