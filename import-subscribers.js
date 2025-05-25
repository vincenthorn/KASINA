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

async function importSubscribers(userType = 'premium', subscribers = premiumSubscribers) {
  console.log(`Starting import of ${userType} subscribers...`);
  
  let addedCount = 0;
  let updatedCount = 0;
  
  for (const subscriber of subscribers) {
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
          [subscriber.name, userType, subscriber.email]
        );
        updatedCount++;
        console.log(`✓ Updated: ${subscriber.email} - ${subscriber.name} (${userType})`);
      } else {
        // Insert new user
        await pool.query(
          'INSERT INTO users (email, name, subscription_type, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
          [subscriber.email, subscriber.name, userType]
        );
        addedCount++;
        console.log(`✓ Added: ${subscriber.email} - ${subscriber.name} (${userType})`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${subscriber.email}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Import complete!`);
  console.log(`📊 Results: ${addedCount} new users added, ${updatedCount} existing users updated`);
  console.log(`📈 Total ${userType} subscribers processed: ${addedCount + updatedCount}`);
  
  // Show final user count
  const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
  console.log(`👥 Total users in database: ${totalUsers.rows[0].count}`);
  
  return { addedCount, updatedCount };
}

// Function to import from CSV data
async function importFromCsvData(csvData, userType = 'freemium') {
  console.log(`Processing CSV data for ${userType} users...`);
  
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',');
  const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email'));
  const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name'));
  
  if (emailIndex === -1) {
    throw new Error('No email column found in CSV data');
  }
  
  const users = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const email = values[emailIndex]?.trim();
    const name = nameIndex !== -1 ? values[nameIndex]?.trim() : null;
    
    if (email && email.includes('@')) {
      users.push({ email, name });
    }
  }
  
  return await importSubscribers(userType, users);
}

importSubscribers().catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});