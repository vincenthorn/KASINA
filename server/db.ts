import { Pool } from 'pg';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface User {
  id: number;
  email: string;
  name?: string;
  subscription_type: 'admin' | 'premium' | 'freemium';
  created_at: Date;
  updated_at: Date;
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

// Get all users with optional subscription type filter
export async function getAllUsers(subscriptionType?: string): Promise<User[]> {
  try {
    let query = 'SELECT * FROM users ORDER BY created_at DESC';
    let params: any[] = [];
    
    if (subscriptionType) {
      query = 'SELECT * FROM users WHERE subscription_type = $1 ORDER BY created_at DESC';
      params = [subscriptionType];
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

// Add or update user
export async function upsertUser(email: string, name?: string, subscriptionType: 'admin' | 'premium' | 'freemium' = 'freemium'): Promise<User | null> {
  try {
    const result = await pool.query(
      `INSERT INTO users (email, name, subscription_type) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO UPDATE SET 
         name = COALESCE($2, users.name),
         subscription_type = $3,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [email.toLowerCase(), name, subscriptionType]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error upserting user:', error);
    return null;
  }
}

// Add multiple users from CSV data
export async function bulkUpsertUsers(users: Array<{email: string, name?: string, subscriptionType: 'admin' | 'premium' | 'freemium'}>): Promise<number> {
  try {
    let insertedCount = 0;
    
    for (const user of users) {
      const result = await upsertUser(user.email, user.name, user.subscriptionType);
      if (result) insertedCount++;
    }
    
    return insertedCount;
  } catch (error) {
    console.error('Error bulk upserting users:', error);
    return 0;
  }
}

// Check if user is whitelisted
export async function isUserWhitelisted(email: string): Promise<boolean> {
  const user = await getUserByEmail(email);
  return user !== null;
}

// Get user subscription type
export async function getUserSubscriptionType(email: string): Promise<'admin' | 'premium' | 'freemium' | null> {
  const user = await getUserByEmail(email);
  return user?.subscription_type || null;
}

// Remove user (admin only action)
export async function removeUser(email: string): Promise<boolean> {
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('Error removing user:', error);
    return false;
  }
}

export interface Session {
  id: number;
  user_email: string;
  kasina_type: string;
  kasina_name: string;
  duration_seconds: number;
  session_date: Date;
  created_at: Date;
}

// Add a new session
export async function addSession(userEmail: string, kasinaType: string, durationSeconds: number, kasinaName?: string): Promise<Session | null> {
  try {
    console.log(`📝 Saving session: ${userEmail}, ${kasinaType}, ${durationSeconds}s, ${kasinaName}`);
    
    const result = await pool.query(
      `INSERT INTO sessions (user_email, kasina_type, kasina_name, duration_seconds) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userEmail.toLowerCase(), kasinaType, kasinaName || kasinaType, durationSeconds]
    );
    
    console.log('✅ Session saved successfully:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Error adding session:', error);
    return null;
  }
}

// Get sessions for a specific user
export async function getUserSessions(userEmail: string): Promise<Session[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM sessions 
       WHERE LOWER(user_email) = LOWER($1) 
       ORDER BY session_date DESC`,
      [userEmail]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
}

// Get all sessions (admin only)
export async function getAllSessions(): Promise<Session[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM sessions ORDER BY session_date DESC'
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting all sessions:', error);
    return [];
  }
}

// Get user practice stats
export async function getUserPracticeStats(userEmail: string): Promise<{totalSeconds: number, sessionCount: number, kasinaBreakdown: {[key: string]: number}}> {
  try {
    const result = await pool.query(
      `SELECT 
         kasina_type,
         SUM(duration_seconds) as total_duration,
         COUNT(*) as session_count
       FROM sessions 
       WHERE LOWER(user_email) = LOWER($1) 
       GROUP BY kasina_type`,
      [userEmail]
    );
    
    const totalSeconds = result.rows.reduce((sum, row) => sum + parseInt(row.total_duration), 0);
    const sessionCount = result.rows.reduce((sum, row) => sum + parseInt(row.session_count), 0);
    const kasinaBreakdown: {[key: string]: number} = {};
    
    result.rows.forEach(row => {
      kasinaBreakdown[row.kasina_type] = parseInt(row.total_duration);
    });
    
    return { totalSeconds, sessionCount, kasinaBreakdown };
  } catch (error) {
    console.error('Error getting user practice stats:', error);
    return { totalSeconds: 0, sessionCount: 0, kasinaBreakdown: {} };
  }
}

// Get all users with their practice stats
export async function getAllUsersWithStats(): Promise<Array<User & {practiceStats: {totalSeconds: number, sessionCount: number}}>> {
  try {
    const result = await pool.query(
      `SELECT 
         u.*,
         COALESCE(SUM(s.duration_seconds), 0) as total_practice_seconds,
         COALESCE(COUNT(s.id), 0) as total_sessions
       FROM users u
       LEFT JOIN sessions s ON LOWER(u.email) = LOWER(s.user_email)
       GROUP BY u.id, u.email, u.name, u.subscription_type, u.created_at, u.updated_at
       ORDER BY u.created_at DESC`
    );
    
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      subscription_type: row.subscription_type,
      created_at: row.created_at,
      updated_at: row.updated_at,
      practiceStats: {
        totalSeconds: parseInt(row.total_practice_seconds),
        sessionCount: parseInt(row.total_sessions)
      }
    }));
  } catch (error) {
    console.error('Error getting users with stats:', error);
    return [];
  }
}

export default pool;