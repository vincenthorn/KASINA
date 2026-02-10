import { Pool } from 'pg';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface User {
  id: number;
  email: string;
  name?: string;
  subscription_type: 'admin' | 'premium' | 'freemium' | 'friend';
  source?: 'csv' | 'jhana_sync' | 'manual';
  auth_code?: string;
  auth_code_expires_at?: Date;
  magic_link_token?: string;
  magic_link_expires_at?: Date;
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
export async function upsertUser(email: string, name?: string, subscriptionType: 'admin' | 'premium' | 'freemium' | 'friend' = 'freemium', source: 'csv' | 'jhana_sync' | 'manual' = 'csv'): Promise<User | null> {
  try {
    const result = await pool.query(
      `INSERT INTO users (email, name, subscription_type, source) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) DO UPDATE SET 
         name = COALESCE($2, users.name),
         subscription_type = $3,
         source = $4,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [email.toLowerCase(), name, subscriptionType, source]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error upserting user:', error);
    return null;
  }
}

// Add multiple users from CSV data
export async function bulkUpsertUsers(users: Array<{email: string, name?: string, subscriptionType: 'admin' | 'premium' | 'freemium' | 'friend'}>): Promise<number> {
  try {
    let processedCount = 0;
    
    for (const user of users) {
      console.log(`🔄 Processing user: ${user.email} as ${user.subscriptionType}`);
      const result = await upsertUser(user.email, user.name, user.subscriptionType);
      if (result) {
        processedCount++;
        console.log(`✅ Successfully processed: ${user.email}`);
      } else {
        console.log(`❌ Failed to process: ${user.email}`);
      }
    }
    
    console.log(`📊 Bulk upsert complete: ${processedCount}/${users.length} users processed`);
    return processedCount;
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
export async function getUserSubscriptionType(email: string): Promise<'admin' | 'premium' | 'freemium' | 'friend' | null> {
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

// Get sessions for a specific user with kasina breakdown data
export async function getUserSessions(userEmail: string): Promise<Session[]> {
  try {
    const result = await pool.query(
      `SELECT 
        s.*,
        COALESCE(
          json_agg(
            json_build_object(
              'kasina_type', kb.kasina_type,
              'duration_seconds', kb.duration_seconds
            )
          ) FILTER (WHERE kb.kasina_type IS NOT NULL),
          '[]'
        ) as kasina_breakdown
       FROM sessions s
       LEFT JOIN kasina_breakdowns kb ON s.id = kb.session_id
       WHERE LOWER(s.user_email) = LOWER($1) 
       GROUP BY s.id
       ORDER BY s.session_date DESC`,
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

// Delete a session (user must own the session)
export async function deleteUserSession(userEmail: string, sessionId: number): Promise<boolean> {
  try {
    console.log(`🗑️ Deleting session: ${sessionId} for user: ${userEmail}`);
    
    // First, delete any kasina breakdown data associated with this session
    await pool.query(
      'DELETE FROM kasina_breakdowns WHERE session_id = $1',
      [sessionId]
    );
    
    // Then delete the session itself, but only if it belongs to the user
    const result = await pool.query(
      'DELETE FROM sessions WHERE id = $1 AND LOWER(user_email) = LOWER($2)',
      [sessionId, userEmail]
    );
    
    const success = (result.rowCount || 0) > 0;
    console.log(success ? '✅ Session deleted successfully' : '❌ Session not found or not owned by user');
    return success;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

// Get all users with their practice stats
export async function getAllUsersWithStats(): Promise<Array<User & {practiceStats: {totalSeconds: number, sessionCount: number}}>> {
  try {
    console.log('🔍 Admin Dashboard: Querying for all users with stats...');
    
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
    
    console.log(`📊 Admin Dashboard: Found ${result.rows.length} users in database`);
    
    if (result.rows.length > 0) {
      console.log('👤 Sample user data:', {
        email: result.rows[0].email,
        subscription_type: result.rows[0].subscription_type,
        total_practice_seconds: result.rows[0].total_practice_seconds
      });
    } else {
      console.log('⚠️ Admin Dashboard: No users found in database - checking table existence...');
      
      // Check if users table exists
      const tableCheck = await pool.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
      );
      console.log('📋 Users table exists:', tableCheck.rows[0].exists);
      
      if (tableCheck.rows[0].exists) {
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        console.log('👥 Total users in table:', userCount.rows[0].count);
      }
    }
    
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
    console.error('❌ Admin Dashboard: Error getting users with stats:', error);
    return [];
  }
}

import crypto from 'crypto';

export function generateAuthCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateMagicLinkToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function setAuthCodes(email: string, authCode: string, magicLinkToken: string): Promise<boolean> {
  try {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const result = await pool.query(
      `UPDATE users SET 
        auth_code = $1, 
        auth_code_expires_at = $2, 
        magic_link_token = $3, 
        magic_link_expires_at = $2,
        updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(email) = LOWER($4)`,
      [authCode, expiresAt, magicLinkToken, email]
    );
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('Error setting auth codes:', error);
    return false;
  }
}

export async function verifyAuthCode(email: string, code: string): Promise<User | null> {
  try {
    const result = await pool.query(
      `SELECT * FROM users 
       WHERE LOWER(email) = LOWER($1) 
       AND auth_code = $2 
       AND auth_code_expires_at > NOW()`,
      [email, code]
    );
    if (result.rows[0]) {
      await pool.query(
        `UPDATE users SET auth_code = NULL, auth_code_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [result.rows[0].id]
      );
      return result.rows[0];
    }
    return null;
  } catch (error) {
    console.error('Error verifying auth code:', error);
    return null;
  }
}

export async function verifyMagicLinkToken(token: string): Promise<User | null> {
  try {
    const result = await pool.query(
      `SELECT * FROM users 
       WHERE magic_link_token = $1 
       AND magic_link_expires_at > NOW()`,
      [token]
    );
    if (result.rows[0]) {
      await pool.query(
        `UPDATE users SET magic_link_token = NULL, magic_link_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [result.rows[0].id]
      );
      return result.rows[0];
    }
    return null;
  } catch (error) {
    console.error('Error verifying magic link token:', error);
    return null;
  }
}

export async function registerUser(email: string): Promise<User | null> {
  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      return existing;
    }
    const result = await pool.query(
      `INSERT INTO users (email, subscription_type, source) 
       VALUES (LOWER($1), 'freemium', 'manual') 
       RETURNING *`,
      [email]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error registering user:', error);
    return null;
  }
}

export default pool;