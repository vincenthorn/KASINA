import pkg from 'pg';
const { Pool } = pkg;

// Neon database (source)
const neonPool = new Pool({
  connectionString: process.env.DATABASE_URL, // Current Neon connection
  ssl: { rejectUnauthorized: false }
});

// We'll need the Render database URL from you
// For now, let's export the data first
async function exportFromNeon() {
  try {
    console.log('Exporting data from Neon database...');
    
    // Export users
    const usersResult = await neonPool.query('SELECT * FROM users ORDER BY created_at');
    console.log(`Found ${usersResult.rows.length} users to migrate`);
    
    // Export sessions
    const sessionsResult = await neonPool.query('SELECT * FROM sessions ORDER BY session_date');
    console.log(`Found ${sessionsResult.rows.length} sessions to migrate`);
    
    // Show sample data
    console.log('\nSample users:');
    usersResult.rows.slice(0, 5).forEach(user => {
      console.log(`  ${user.email} (${user.subscription_type})`);
    });
    
    console.log('\nSample sessions:');
    sessionsResult.rows.slice(0, 3).forEach(session => {
      console.log(`  ${session.user_email} - ${session.duration_seconds}s`);
    });
    
    return {
      users: usersResult.rows,
      sessions: sessionsResult.rows
    };
    
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  } finally {
    await neonPool.end();
  }
}

async function importToRender(data, renderDatabaseUrl) {
  const renderPool = new Pool({
    connectionString: renderDatabaseUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('\nImporting data to Render database...');
    
    // Import users
    let userCount = 0;
    for (const user of data.users) {
      try {
        await renderPool.query(
          `INSERT INTO users (email, name, subscription_type, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT (email) DO NOTHING`,
          [user.email, user.name, user.subscription_type, user.created_at, user.updated_at]
        );
        userCount++;
      } catch (error) {
        console.error(`Error importing user ${user.email}:`, error.message);
      }
    }
    console.log(`Imported ${userCount} users`);
    
    // Import sessions
    let sessionCount = 0;
    for (const session of data.sessions) {
      try {
        await renderPool.query(
          `INSERT INTO sessions (user_email, kasina_type, duration_seconds, session_date, notes) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT DO NOTHING`,
          [session.user_email, session.kasina_type, session.duration_seconds, session.session_date, session.notes]
        );
        sessionCount++;
      } catch (error) {
        console.error(`Error importing session:`, error.message);
      }
    }
    console.log(`Imported ${sessionCount} sessions`);
    
    // Verify final counts
    const finalUserCount = await renderPool.query('SELECT COUNT(*) as count FROM users');
    const finalSessionCount = await renderPool.query('SELECT COUNT(*) as count FROM sessions');
    
    console.log(`\nFinal verification:`);
    console.log(`Users in Render database: ${finalUserCount.rows[0].count}`);
    console.log(`Sessions in Render database: ${finalSessionCount.rows[0].count}`);
    
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  } finally {
    await renderPool.end();
  }
}

// First, export the data
exportFromNeon()
  .then(data => {
    console.log('\n=== EXPORT COMPLETE ===');
    console.log('Data exported successfully. To complete the migration:');
    console.log('1. Get your Render PostgreSQL database URL from the Render dashboard');
    console.log('2. Run: RENDER_DATABASE_URL="your_render_url" node migrate-neon-to-render.js import');
    
    // Save data to file for import step
    import fs from 'fs';
    fs.writeFileSync('migration-data.json', JSON.stringify(data, null, 2));
    console.log('Data saved to migration-data.json');
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });