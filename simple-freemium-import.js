import { Pool } from 'pg';
import fs from 'fs';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function simpleFreemiumImport(csvFilePath) {
  console.log('Starting simple freemium import...');
  
  try {
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    const lines = csvData.trim().split('\n');
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const emailIndex = headers.findIndex(h => h.includes('email'));
    const nameIndex = headers.findIndex(h => h.includes('name'));
    
    console.log(`Processing ${lines.length - 1} users...`);
    
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const email = values[emailIndex]?.trim();
      const name = nameIndex !== -1 ? values[nameIndex]?.trim() : 'Freemium User';
      
      if (!email || !email.includes('@')) {
        skippedCount++;
        continue;
      }
      
      try {
        // Check if user exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
          [email]
        );
        
        if (existingUser.rows.length > 0) {
          // Update existing user to freemium if they're not premium/admin
          const result = await pool.query(
            'UPDATE users SET name = $1, subscription_type = $2, updated_at = NOW() WHERE LOWER(email) = LOWER($3) AND subscription_type NOT IN ($4, $5)',
            [name || 'Freemium User', 'freemium', email, 'premium', 'admin']
          );
          if (result.rowCount > 0) {
            updatedCount++;
          } else {
            skippedCount++; // Already premium/admin
          }
        } else {
          // Insert new freemium user
          await pool.query(
            'INSERT INTO users (email, name, subscription_type, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
            [email, name || 'Freemium User', 'freemium']
          );
          addedCount++;
        }
        
        if (i % 100 === 0) {
          console.log(`Progress: ${i}/${lines.length - 1} - Added: ${addedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`);
        }
        
      } catch (error) {
        console.error(`Error processing ${email}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log('\n🎉 Simple import complete!');
    console.log(`📊 Results:`);
    console.log(`   ✅ ${addedCount} new freemium users added`);
    console.log(`   🔄 ${updatedCount} existing users updated to freemium`);
    console.log(`   ⏭️  ${skippedCount} users skipped (duplicates/invalid/premium)`);
    
    // Final count
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const freemiumUsers = await pool.query('SELECT COUNT(*) FROM users WHERE subscription_type = $1', ['freemium']);
    const premiumUsers = await pool.query('SELECT COUNT(*) FROM users WHERE subscription_type = $1', ['premium']);
    
    console.log(`👥 Total users in database: ${totalUsers.rows[0].count}`);
    console.log(`🆓 Total freemium users: ${freemiumUsers.rows[0].count}`);
    console.log(`💎 Total premium users: ${premiumUsers.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

const csvFilePath = 'server/dAVelXfDTd61CshQesn2Wg.csv';
simpleFreemiumImport(csvFilePath);