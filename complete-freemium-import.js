import fs from 'fs';
import { parse } from 'csv-parse';
import pkg from 'pg';
const { Pool } = pkg;

const databaseUrl = process.env.RENDER_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('No database URL found');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function completeFreemiumImport() {
  try {
    const csvData = fs.readFileSync('new-freemium-subscribers.csv', 'utf8');
    
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

    console.log(`Processing ${records.length} total records from CSV`);

    // Get all existing emails to avoid duplicates
    const existingEmailsResult = await pool.query('SELECT email FROM users');
    const existingEmails = new Set(existingEmailsResult.rows.map(row => row.email));
    
    console.log(`Found ${existingEmails.size} existing users in database`);

    const newUsers = [];
    let skipped = 0;

    for (const record of records) {
      const email = record.Email?.toLowerCase().trim();
      
      if (!email || email === 'email' || !email.includes('@')) {
        skipped++;
        continue;
      }

      if (existingEmails.has(email)) {
        skipped++;
        continue;
      }

      newUsers.push({
        email: email,
        subscription_type: 'freemium',
        created_at: new Date()
      });
    }

    console.log(`${newUsers.length} new users to import, ${skipped} skipped`);

    if (newUsers.length > 0) {
      // Batch insert remaining users
      const batchSize = 100;
      let imported = 0;

      for (let i = 0; i < newUsers.length; i += batchSize) {
        const batch = newUsers.slice(i, i + batchSize);
        
        const values = batch.map((user, index) => {
          const baseIndex = i * 3 + index * 3;
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`;
        }).join(', ');

        const params = batch.flatMap(user => [user.email, user.subscription_type, user.created_at]);
        const query = `INSERT INTO users (email, subscription_type, created_at) VALUES ${values}`;

        try {
          await pool.query(query, params);
          imported += batch.length;
          console.log(`Imported batch: ${imported}/${newUsers.length}`);
        } catch (error) {
          console.error(`Error importing batch:`, error.message);
        }
      }

      console.log(`Successfully imported ${imported} new freemium users`);
    }

    // Final count
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM users WHERE subscription_type = $1', ['freemium']);
    console.log(`Total freemium users now: ${finalCount.rows[0].count}`);

  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await pool.end();
  }
}

completeFreemiumImport();