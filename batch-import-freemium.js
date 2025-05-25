import { Pool } from 'pg';
import fs from 'fs';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function batchImportFreemium(csvFilePath) {
  console.log('Starting efficient batch import of freemium users...');
  
  try {
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    const lines = csvData.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const emailIndex = headers.findIndex(h => h.includes('email'));
    const nameIndex = headers.findIndex(h => h.includes('name'));
    
    console.log(`Found ${lines.length - 1} total users to process`);
    
    // Get existing emails to avoid duplicates
    const existingEmailsResult = await pool.query('SELECT LOWER(email) as email FROM users');
    const existingEmails = new Set(existingEmailsResult.rows.map(row => row.email));
    console.log(`Found ${existingEmails.size} existing users in database`);
    
    // Prepare batch insert data
    const usersToInsert = [];
    let skippedCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const email = values[emailIndex]?.trim().toLowerCase();
      const name = nameIndex !== -1 ? values[nameIndex]?.trim() : 'Freemium User';
      
      if (email && email.includes('@') && !existingEmails.has(email)) {
        usersToInsert.push({
          email: email,
          name: name || 'Freemium User'
        });
      } else {
        skippedCount++;
      }
      
      if (i % 200 === 0) {
        console.log(`Processed ${i}/${lines.length - 1} rows...`);
      }
    }
    
    console.log(`Prepared ${usersToInsert.length} new users for insertion`);
    console.log(`Skipped ${skippedCount} users (duplicates or invalid emails)`);
    
    // Batch insert in chunks of 100
    const chunkSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < usersToInsert.length; i += chunkSize) {
      const chunk = usersToInsert.slice(i, i + chunkSize);
      
      // Build bulk insert query
      const values = [];
      const placeholders = [];
      
      chunk.forEach((user, index) => {
        const baseIndex = index * 3;
        values.push(user.email, user.name, 'freemium');
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`);
      });
      
      const query = `
        INSERT INTO users (email, name, subscription_type, created_at, updated_at) 
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (email) DO NOTHING
      `.replace(/\$(\d+)/g, (match, num) => `$${num}`);
      
      try {
        await pool.query(query, values);
        insertedCount += chunk.length;
        console.log(`✅ Inserted batch: ${insertedCount}/${usersToInsert.length} users`);
      } catch (error) {
        console.error(`❌ Error inserting batch at position ${i}:`, error.message);
      }
    }
    
    console.log('\n🎉 Batch import complete!');
    console.log(`📊 Results: ${insertedCount} freemium users successfully added`);
    
    // Final count
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const freemiumUsers = await pool.query('SELECT COUNT(*) FROM users WHERE subscription_type = $1', ['freemium']);
    console.log(`👥 Total users in database: ${totalUsers.rows[0].count}`);
    console.log(`🆓 Total freemium users: ${freemiumUsers.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Batch import failed:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Get CSV file path from command line argument
const csvFilePath = process.argv[2] || 'server/dAVelXfDTd61CshQesn2Wg.csv';

if (!fs.existsSync(csvFilePath)) {
  console.error(`CSV file not found: ${csvFilePath}`);
  process.exit(1);
}

batchImportFreemium(csvFilePath);