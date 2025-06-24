import fs from 'fs';
import { parse } from 'csv-parse';
import pkg from 'pg';
const { Pool } = pkg;

// Use production database URL - prioritize RENDER_DATABASE_URL, fallback to DATABASE_URL
const databaseUrl = process.env.RENDER_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ No database URL found. Set RENDER_DATABASE_URL or DATABASE_URL.');
  process.exit(1);
}

console.log('🚀 Connecting to production database...');

// Connect to production database
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function importFreemiumFromCsv(csvFilePath) {
  console.log(`Processing CSV file: ${csvFilePath}`);
  
  try {
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    
    // Parse CSV data
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

    console.log(`Found ${records.length} records in CSV`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of records) {
      const email = record.Email?.toLowerCase().trim();
      
      if (!email || email === 'email') {
        console.log(`Skipping invalid email: ${record.Email}`);
        skipped++;
        continue;
      }

      try {
        // Check if user already exists
        const existingUserQuery = 'SELECT id FROM users WHERE email = $1 LIMIT 1';
        const existingUser = await pool.query(existingUserQuery, [email]);
        
        if (existingUser.rows.length > 0) {
          console.log(`User already exists: ${email}`);
          skipped++;
          continue;
        }

        // Insert new freemium user
        const insertQuery = 'INSERT INTO users (email, subscription_type, created_at) VALUES ($1, $2, $3)';
        await pool.query(insertQuery, [email, 'freemium', new Date()]);

        console.log(`Added freemium user: ${email}`);
        imported++;

      } catch (error) {
        console.error(`Error processing ${email}:`, error.message);
        errors++;
      }
    }

    console.log('\nImport Summary:');
    console.log(`   Imported: ${imported} users`);
    console.log(`   Skipped: ${skipped} users`);
    console.log(`   Errors: ${errors} users`);
    console.log(`   Total processed: ${records.length} records`);

  } catch (error) {
    console.error('Failed to import CSV:', error);
  } finally {
    // Close database connection
    await pool.end();
    console.log('Database connection closed');
  }
}

// Run the import
importFreemiumFromCsv('new-freemium-subscribers.csv')
  .then(() => {
    console.log('🎉 Import process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import failed:', error);
    process.exit(1);
  });