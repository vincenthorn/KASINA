import pkg from 'pg';
const { Pool } = pkg;

const RENDER_DB_URL = "postgresql://kasina_db_user:RM46kdotjS4evLWxJTkyE7HgxRyi6TUI@dpg-d0urk9be5dus73a7dc5g-a.virginia-postgres.render.com/kasina_db";

async function updateSchema() {
  const renderPool = new Pool({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('Updating Render database schema...');
    
    // Add missing columns to users table
    await renderPool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50) DEFAULT 'freemium',
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    `);
    
    console.log('Added columns to users table');
    
    // Update sessions table if needed
    await renderPool.query(`
      ALTER TABLE sessions 
      ADD COLUMN IF NOT EXISTS notes TEXT
    `);
    
    console.log('Updated sessions table');
    
    // Verify schema
    const userColumns = await renderPool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('\nUpdated users table schema:');
    userColumns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Schema update failed:', error);
    throw error;
  } finally {
    await renderPool.end();
  }
}

updateSchema();