import { Pool } from 'pg';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Premium subscribers from your CSV
const premiumSubscribers = [
  { email: 'nelsonmelina@pm.me', name: 'Computer Poet' },
  { email: 'marie.a.ramos@gmail.com', name: 'Marie Ramos' },
  { email: 'brent@brentbaum.com', name: 'Brent' },
  { email: 'vijaydukkipati1995@gmail.com', name: 'TheMysticMan' },
  { email: 'derekhaswell@gmail.com', name: 'Derek Haswell' },
  { email: 'jtyre2@aol.com', name: 'John Tyrrell' },
  { email: 'anbakeriii@proton.me', name: 'Adrian Baker' },
  { email: 'c.tully.lewis@gmail.com', name: 'Chris' },
  { email: 'brettastor@gmail.com', name: 'Brett' },
  { email: 'petefarq@gmail.com', name: 'Pete Farquhar' },
  { email: 'gloverben@mac.com', name: 'Ben G' },
  { email: 'amgrzesina@gmail.com', name: 'Andrea' },
  { email: 'carlgregg@gmail.com', name: 'Carl Gregg' },
  { email: 'lisashermanavl@gmail.com', name: 'Lisa Sherman' }
];

async function importSubscribers() {
  console.log('Starting import of premium subscribers...');
  
  let addedCount = 0;
  let updatedCount = 0;
  
  for (const subscriber of premiumSubscribers) {
    try {
      // Check if user exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [subscriber.email]
      );
      
      if (existingUser.rows.length > 0) {
        // Update existing user
        await pool.query(
          'UPDATE users SET name = $1, subscription_type = $2, updated_at = NOW() WHERE LOWER(email) = LOWER($3)',
          [subscriber.name, 'premium', subscriber.email]
        );
        updatedCount++;
        console.log(`✓ Updated: ${subscriber.email} - ${subscriber.name}`);
      } else {
        // Insert new user
        await pool.query(
          'INSERT INTO users (email, name, subscription_type, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
          [subscriber.email, subscriber.name, 'premium']
        );
        addedCount++;
        console.log(`✓ Added: ${subscriber.email} - ${subscriber.name}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${subscriber.email}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Import complete!`);
  console.log(`📊 Results: ${addedCount} new users added, ${updatedCount} existing users updated`);
  console.log(`📈 Total premium subscribers processed: ${addedCount + updatedCount}`);
  
  // Show final user count
  const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
  console.log(`👥 Total users in database: ${totalUsers.rows[0].count}`);
  
  process.exit(0);
}

importSubscribers().catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});