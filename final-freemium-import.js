import fs from 'fs';
import { parse } from 'csv-parse';
import pkg from 'pg';
const { Pool } = pkg;

const databaseUrl = process.env.RENDER_DATABASE_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function finalFreemiumImport() {
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

    console.log(`Processing ${records.length} records from CSV`);

    // Get existing emails
    const existingEmailsResult = await pool.query('SELECT email FROM users');
    const existingEmails = new Set(existingEmailsResult.rows.map(row => row.email));
    
    let imported = 0;
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

      try {
        // Insert one by one to avoid parameter issues
        await pool.query(
          'INSERT INTO users (email, subscription_type, created_at) VALUES ($1, $2, $3)',
          [email, 'freemium', new Date()]
        );
        imported++;
        
        if (imported % 100 === 0) {
          console.log(`Imported: ${imported}`);
        }
      } catch (error) {
        console.error(`Error importing ${email}:`, error.message);
        skipped++;
      }
    }

    console.log(`Import complete: ${imported} imported, ${skipped} skipped`);

    // Final count
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM users WHERE subscription_type = $1', ['freemium']);
    console.log(`Total freemium users: ${finalCount.rows[0].count}`);

  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await pool.end();
  }
}

finalFreemiumImport();