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

export default pool;