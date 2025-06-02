import { Pool } from 'pg';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function reimportUsers() {
  const renderDb = new Pool({
    connectionString: "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db",
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Re-importing users with correct schema...');
    
    const exportData = JSON.parse(readFileSync('replit-data-export.json', 'utf8'));
    
    // Clear existing users
    await renderDb.query('DELETE FROM users');
    
    // Import users with correct schema mapping
    for (const user of exportData.users) {
      const isWhitelisted = user.subscription_type === 'premium' || user.subscription_type === 'admin';
      
      await renderDb.query(
        'INSERT INTO users (id, email, is_whitelisted, created_at) VALUES ($1, $2, $3, $4)',
        [user.id, user.email, isWhitelisted, user.created_at]
      );
    }
    
    console.log(`✅ Re-imported ${exportData.users.length} users with correct schema`);
    
    // Update sequence
    await renderDb.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
    
    console.log('✅ User re-import completed successfully!');
    
  } catch (error) {
    console.error('❌ Re-import failed:', error);
  } finally {
    await renderDb.end();
  }
}

reimportUsers();