import fs from 'fs';
import { parse } from 'csv-parse';
import pkg from 'pg';
const { Pool } = pkg;

// Use the environment variable approach similar to the production server
const DATABASE_URL = process.env.DATABASE_URL || process.env.RENDER_DATABASE_URL;

async function directProductionImport() {
  console.log('Connecting to database...');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('Database connection successful');

    // Check if we're connected to the right database by checking current counts
    const currentCounts = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE subscription_type = 'freemium') as freemium_users,
        COUNT(*) FILTER (WHERE subscription_type = 'premium') as premium_users,
        COUNT(*) FILTER (WHERE subscription_type = 'admin') as admin_users
      FROM users
    `);

    console.log('Current database status:');
    console.log(`Total users: ${currentCounts.rows[0].total_users}`);
    console.log(`Freemium users: ${currentCounts.rows[0].freemium_users}`);
    console.log(`Premium users: ${currentCounts.rows[0].premium_users}`);
    console.log(`Admin users: ${currentCounts.rows[0].admin_users}`);

    // Only proceed if this looks like the production database (with ~1400 users)
    const currentFreemium = parseInt(currentCounts.rows[0].freemium_users);
    if (currentFreemium > 2000) {
      console.log('This database already has the imported users. Skipping import.');
      return;
    }

    // Load CSV data
    const csvData = fs.readFileSync('attached_assets/s1EdNrH8TrOz50GphmY4Yw_1750784550768.csv', 'utf8');
    
    const records = await new Promise((resolve, reject) => {
      parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    console.log(`Processing ${records.length} CSV records`);

    // Get existing emails
    const existingResult = await pool.query('SELECT email FROM users');
    const existingEmails = new Set(existingResult.rows.map(row => row.email.toLowerCase()));
    
    // Process new users
    const newUsers = [];
    
    for (const record of records) {
      const email = record.Email?.toLowerCase().trim();
      
      if (!email || email === 'email' || !email.includes('@')) {
        continue;
      }

      if (!existingEmails.has(email)) {
        newUsers.push(email);
      }
    }

    console.log(`Found ${newUsers.length} new users to import`);

    if (newUsers.length === 0) {
      console.log('No new users to import');
      return;
    }

    // Import in batches
    const batchSize = 100;
    let imported = 0;

    for (let i = 0; i < newUsers.length; i += batchSize) {
      const batch = newUsers.slice(i, i + batchSize);
      
      // Use individual inserts to avoid parameter limit issues
      for (const email of batch) {
        try {
          await pool.query(
            'INSERT INTO users (email, subscription_type, created_at) VALUES ($1, $2, $3)',
            [email, 'freemium', new Date()]
          );
          imported++;
          
          if (imported % 100 === 0) {
            console.log(`Imported ${imported}/${newUsers.length} users`);
          }
        } catch (error) {
          if (!error.message.includes('duplicate key')) {
            console.error(`Failed to import ${email}:`, error.message);
          }
        }
      }
    }

    console.log(`Import completed: ${imported} users added`);

    // Get final counts
    const finalCounts = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE subscription_type = 'freemium') as freemium_users,
        COUNT(*) FILTER (WHERE subscription_type = 'premium') as premium_users,
        COUNT(*) FILTER (WHERE subscription_type = 'admin') as admin_users
      FROM users
    `);

    console.log('Final database status:');
    console.log(`Total users: ${finalCounts.rows[0].total_users}`);
    console.log(`Freemium users: ${finalCounts.rows[0].freemium_users}`);
    console.log(`Premium users: ${finalCounts.rows[0].premium_users}`);
    console.log(`Admin users: ${finalCounts.rows[0].admin_users}`);

  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await pool.end();
  }
}

directProductionImport();