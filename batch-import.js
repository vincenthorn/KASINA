import { Pool } from 'pg';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function batchImport() {
  const renderDb = new Pool({
    connectionString: "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db",
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Batch importing all users...');
    
    const exportData = JSON.parse(readFileSync('replit-data-export.json', 'utf8'));
    
    // Build batch insert query for users
    const userValues = exportData.users.map((user, index) => {
      const baseIndex = index * 6;
      return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
    }).join(', ');
    
    const userParams = exportData.users.flatMap(user => [
      user.id, user.email, user.name, user.subscription_type, user.created_at, user.updated_at
    ]);
    
    const userQuery = `
      INSERT INTO users (id, email, name, subscription_type, created_at, updated_at) 
      VALUES ${userValues}
      ON CONFLICT (email) DO NOTHING
    `;
    
    // Clear existing data
    await renderDb.query('DELETE FROM users');
    
    // Insert all users in one query
    await renderDb.query(userQuery, userParams);
    console.log(`✅ Imported ${exportData.users.length} users`);
    
    // Import kasina breakdowns
    if (exportData.kasina_breakdowns && exportData.kasina_breakdowns.length > 0) {
      await renderDb.query('DELETE FROM kasina_breakdowns');
      
      for (const breakdown of exportData.kasina_breakdowns) {
        await renderDb.query(
          'INSERT INTO kasina_breakdowns (id, type, data, created_at) VALUES ($1, $2, $3, $4)',
          [breakdown.id, breakdown.type, breakdown.data, breakdown.created_at]
        );
      }
      console.log(`✅ Imported ${exportData.kasina_breakdowns.length} kasina breakdowns`);
    }
    
    console.log('✅ Complete migration finished!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await renderDb.end();
  }
}

batchImport();