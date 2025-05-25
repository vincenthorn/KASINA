import { Pool } from 'pg';
import fs from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function directSqlImport() {
  console.log('Starting direct SQL import for all freemium users...');
  
  try {
    const csvData = fs.readFileSync('server/dAVelXfDTd61CshQesn2Wg.csv', 'utf8');
    const lines = csvData.trim().split('\n');
    
    console.log(`Processing ${lines.length - 1} users from CSV...`);
    
    // Process in smaller chunks to avoid timeouts
    const chunkSize = 50;
    let totalAdded = 0;
    
    for (let i = 1; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize);
      const insertValues = [];
      
      for (const line of chunk) {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const email = values[0]?.trim();
        const name = values[1]?.trim() || 'Freemium User';
        
        if (email && email.includes('@')) {
          insertValues.push(`('${email.replace(/'/g, "''")}', '${name.replace(/'/g, "''")}', 'freemium', NOW(), NOW())`);
        }
      }
      
      if (insertValues.length > 0) {
        const query = `
          INSERT INTO users (email, name, subscription_type, created_at, updated_at)
          VALUES ${insertValues.join(', ')}
          ON CONFLICT (email) DO NOTHING
        `;
        
        const result = await pool.query(query);
        totalAdded += insertValues.length;
        console.log(`✅ Processed chunk ${Math.floor(i/chunkSize) + 1}: ${totalAdded} users processed`);
      }
    }
    
    console.log(`\n🎉 Import complete! Processed ${totalAdded} users`);
    
    // Final count
    const counts = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN subscription_type = 'freemium' THEN 1 END) as freemium,
        COUNT(CASE WHEN subscription_type = 'premium' THEN 1 END) as premium
      FROM users
    `);
    
    const { total, freemium, premium } = counts.rows[0];
    console.log(`👥 Database totals: ${total} users (${freemium} freemium, ${premium} premium)`);
    
  } catch (error) {
    console.error('Import error:', error.message);
  } finally {
    await pool.end();
  }
}

directSqlImport();