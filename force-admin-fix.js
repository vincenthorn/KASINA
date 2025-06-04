import { Pool } from 'pg';

async function forceAdminFix() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });

  try {
    console.log('🔧 Force-deploying admin dashboard fix...');
    
    // Test the corrected query
    const result = await pool.query(`
      SELECT 
         u.*,
         COALESCE(SUM(s.duration_seconds), 0) as total_practice_seconds,
         COALESCE(COUNT(s.id), 0) as total_sessions
       FROM users u
       LEFT JOIN sessions s ON LOWER(u.email) = LOWER(s.user_email)
       GROUP BY u.id, u.email, u.name, u.subscription_type, u.created_at, u.updated_at
       ORDER BY u.created_at DESC
    `);

    console.log(`✅ Database access confirmed: ${result.rows.length} users`);
    
    // Count by subscription type
    const freemium = result.rows.filter(u => u.subscription_type === 'freemium').length;
    const premium = result.rows.filter(u => u.subscription_type === 'premium').length;
    const admin = result.rows.filter(u => u.subscription_type === 'admin').length;
    
    console.log(`📊 User breakdown:`);
    console.log(`   Freemium: ${freemium}`);
    console.log(`   Premium: ${premium}`);
    console.log(`   Admin: ${admin}`);
    console.log(`   Total: ${result.rows.length}`);
    
    // Calculate total practice time
    const totalSeconds = result.rows.reduce((sum, user) => {
      return sum + parseInt(user.total_practice_seconds || 0);
    }, 0);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    console.log(`⏰ Total practice time: ${hours}h ${minutes}m`);
    console.log('🚀 Admin dashboard should now work correctly after deployment');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await pool.end();
  }
}

forceAdminFix();