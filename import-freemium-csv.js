import { Pool } from 'pg';
import fs from 'fs';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function importFreemiumFromCsv(csvFilePath) {
  console.log('Starting freemium CSV import...');
  
  try {
    // Read the CSV file
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    const lines = csvData.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    console.log('CSV headers:', headers);
    
    // Find email and name columns
    const emailIndex = headers.findIndex(h => 
      h.includes('email') || h === 'email address' || h === 'emailaddress'
    );
    const nameIndex = headers.findIndex(h => 
      h.includes('name') || h === 'full name' || h === 'fullname'
    );
    
    if (emailIndex === -1) {
      throw new Error('No email column found in CSV. Expected columns like "Email", "email", "Email Address"');
    }
    
    console.log(`Found email column at index ${emailIndex}`);
    if (nameIndex !== -1) {
      console.log(`Found name column at index ${nameIndex}`);
    }
    
    let addedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const email = values[emailIndex]?.trim();
      const name = nameIndex !== -1 ? values[nameIndex]?.trim() : null;
      
      if (!email || !email.includes('@')) {
        console.log(`⚠️  Skipping row ${i}: Invalid email "${email}"`);
        errorCount++;
        continue;
      }
      
      try {
        // Check if user exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
          [email]
        );
        
        if (existingUser.rows.length > 0) {
          // Update existing user to freemium
          await pool.query(
            'UPDATE users SET name = $1, subscription_type = $2, updated_at = NOW() WHERE LOWER(email) = LOWER($3)',
            [name || 'Freemium User', 'freemium', email]
          );
          updatedCount++;
          console.log(`✓ Updated: ${email} - ${name || 'No name'} (freemium)`);
        } else {
          // Insert new freemium user
          await pool.query(
            'INSERT INTO users (email, name, subscription_type, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
            [email, name || 'Freemium User', 'freemium']
          );
          addedCount++;
          console.log(`✓ Added: ${email} - ${name || 'No name'} (freemium)`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${email}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Freemium import complete!`);
    console.log(`📊 Results:`);
    console.log(`   ✅ ${addedCount} new freemium users added`);
    console.log(`   🔄 ${updatedCount} existing users updated to freemium`);
    console.log(`   ❌ ${errorCount} errors/skipped rows`);
    console.log(`📈 Total freemium users processed: ${addedCount + updatedCount}`);
    
    // Show final user count
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const freemiumUsers = await pool.query('SELECT COUNT(*) FROM users WHERE subscription_type = $1', ['freemium']);
    console.log(`👥 Total users in database: ${totalUsers.rows[0].count}`);
    console.log(`🆓 Total freemium users: ${freemiumUsers.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Get CSV file path from command line argument
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.error('Please provide the CSV file path as an argument');
  console.error('Usage: node import-freemium-csv.js /path/to/your/freemium-users.csv');
  process.exit(1);
}

if (!fs.existsSync(csvFilePath)) {
  console.error(`CSV file not found: ${csvFilePath}`);
  process.exit(1);
}

importFreemiumFromCsv(csvFilePath);