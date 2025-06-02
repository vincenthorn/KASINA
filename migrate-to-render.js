import { Pool } from 'pg';
import { readFileSync, writeFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Replit database connection (current)
const replitDb = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function exportData() {
  console.log('🔄 Exporting data from Replit database...');
  
  try {
    // Export users
    const usersResult = await replitDb.query('SELECT * FROM users ORDER BY id');
    console.log(`📊 Found ${usersResult.rows.length} users`);
    
    // Export sessions
    const sessionsResult = await replitDb.query('SELECT * FROM sessions ORDER BY created_at');
    console.log(`📊 Found ${sessionsResult.rows.length} sessions`);
    
    // Export kasina_breakdowns
    const breakdownsResult = await replitDb.query('SELECT * FROM kasina_breakdowns ORDER BY id');
    console.log(`📊 Found ${breakdownsResult.rows.length} kasina breakdowns`);
    
    // Create export object
    const exportData = {
      users: usersResult.rows,
      sessions: sessionsResult.rows,
      kasina_breakdowns: breakdownsResult.rows,
      exported_at: new Date().toISOString()
    };
    
    // Write to file
    writeFileSync('replit-data-export.json', JSON.stringify(exportData, null, 2));
    console.log('✅ Data exported to replit-data-export.json');
    
    return exportData;
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

async function importToRender(exportData, renderDatabaseUrl) {
  console.log('🔄 Importing data to Render database...');
  
  const renderDb = new Pool({
    connectionString: renderDatabaseUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Start transaction
    await renderDb.query('BEGIN');
    
    // Clear existing data (if any)
    await renderDb.query('DELETE FROM kasina_breakdowns');
    await renderDb.query('DELETE FROM sessions');
    await renderDb.query('DELETE FROM users');
    
    console.log('🗑️ Cleared existing data');
    
    // Import users
    for (const user of exportData.users) {
      await renderDb.query(
        'INSERT INTO users (id, email, name, subscription_type, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [user.id, user.email, user.name, user.subscription_type, user.created_at, user.updated_at]
      );
    }
    console.log(`✅ Imported ${exportData.users.length} users`);
    
    // Import sessions
    for (const session of exportData.sessions) {
      await renderDb.query(
        'INSERT INTO sessions (sid, sess, expire) VALUES ($1, $2, $3)',
        [session.sid, session.sess, session.expire]
      );
    }
    console.log(`✅ Imported ${exportData.sessions.length} sessions`);
    
    // Import kasina_breakdowns
    for (const breakdown of exportData.kasina_breakdowns) {
      await renderDb.query(
        'INSERT INTO kasina_breakdowns (id, type, data, created_at) VALUES ($1, $2, $3, $4)',
        [breakdown.id, breakdown.type, breakdown.data, breakdown.created_at]
      );
    }
    console.log(`✅ Imported ${exportData.kasina_breakdowns.length} kasina breakdowns`);
    
    // Update sequences
    await renderDb.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
    await renderDb.query("SELECT setval('kasina_breakdowns_id_seq', (SELECT MAX(id) FROM kasina_breakdowns))");
    
    // Commit transaction
    await renderDb.query('COMMIT');
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    await renderDb.query('ROLLBACK');
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await renderDb.end();
  }
}

// Main function
async function migrate() {
  try {
    // Export from Replit
    const data = await exportData();
    
    console.log('\n📋 Data export summary:');
    console.log(`Users: ${data.users.length}`);
    console.log(`Sessions: ${data.sessions.length}`);
    console.log(`Kasina Breakdowns: ${data.kasina_breakdowns.length}`);
    
    console.log('\n🔗 To complete the migration, run:');
    console.log('RENDER_DATABASE_URL="your-render-db-url" node migrate-to-render.js import');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await replitDb.end();
  }
}

// Handle command line arguments
const command = process.argv[2];

if (command === 'import') {
  // Import mode - requires RENDER_DATABASE_URL
  const renderDbUrl = process.env.RENDER_DATABASE_URL;
  if (!renderDbUrl) {
    console.error('❌ RENDER_DATABASE_URL environment variable required for import');
    process.exit(1);
  }
  
  try {
    const exportData = JSON.parse(readFileSync('replit-data-export.json', 'utf8'));
    await importToRender(exportData, renderDbUrl);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
} else {
  // Export mode (default)
  migrate();
}