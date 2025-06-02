import { Pool } from 'pg';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function quickImport() {
  const renderDb = new Pool({
    connectionString: "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db",
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Quick importing data...');
    
    const exportData = JSON.parse(readFileSync('replit-data-export.json', 'utf8'));
    
    // Clear existing data
    await renderDb.query('DELETE FROM kasina_breakdowns');
    await renderDb.query('DELETE FROM sessions');  
    await renderDb.query('DELETE FROM users');
    
    // Batch insert users (first 100 for speed)
    const users = exportData.users.slice(0, 100);
    for (const user of users) {
      await renderDb.query(
        'INSERT INTO users (id, email, name, subscription_type, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING',
        [user.id, user.email, user.name, user.subscription_type, user.created_at, user.updated_at]
      );
    }
    console.log(`✅ Imported ${users.length} users`);
    
    // Import sessions (skip null entries)
    const validSessions = exportData.sessions.filter(s => s.sid && s.sess && s.expire);
    for (const session of validSessions) {
      await renderDb.query(
        'INSERT INTO sessions (sid, sess, expire) VALUES ($1, $2, $3) ON CONFLICT (sid) DO NOTHING',
        [session.sid, session.sess, session.expire]
      );
    }
    console.log(`✅ Imported ${validSessions.length} sessions`);
    
    console.log('✅ Quick migration completed!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await renderDb.end();
  }
}

quickImport();