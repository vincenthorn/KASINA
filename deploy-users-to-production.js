import fs from 'fs';
import { parse } from 'csv-parse';

// Create endpoint to import users to production database
const PRODUCTION_URL = 'https://kasina-app.onrender.com'; // Replace with actual production URL

async function uploadUsersToProduction() {
  try {
    console.log('Reading local CSV files...');
    
    const csvFiles = [
      { file: 'whitelist.csv', type: 'freemium' },
      { file: 'whitelist-freemium.csv', type: 'freemium' },
      { file: 'whitelist-premium.csv', type: 'premium' },
      { file: 'whitelist-admin.csv', type: 'admin' }
    ];
    
    let allUsers = [];
    
    for (const { file, type } of csvFiles) {
      if (fs.existsSync(file)) {
        console.log(`Reading ${file}...`);
        const users = await readCSVFile(file, type);
        allUsers = allUsers.concat(users);
        console.log(`Added ${users.length} ${type} users`);
      }
    }
    
    // Remove duplicates
    const uniqueUsers = allUsers.filter((user, index, self) => 
      index === self.findIndex(u => u.email === user.email)
    );
    
    console.log(`Total unique users to upload: ${uniqueUsers.length}`);
    
    // Upload to production in batches
    const batchSize = 100;
    let uploaded = 0;
    
    for (let i = 0; i < uniqueUsers.length; i += batchSize) {
      const batch = uniqueUsers.slice(i, i + batchSize);
      
      try {
        const response = await fetch(`${PRODUCTION_URL}/api/admin/batch-import-users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ users: batch })
        });
        
        if (response.ok) {
          uploaded += batch.length;
          console.log(`Uploaded batch ${Math.floor(i/batchSize) + 1}: ${uploaded}/${uniqueUsers.length} users`);
        } else {
          console.error(`Failed to upload batch ${Math.floor(i/batchSize) + 1}:`, response.status);
        }
      } catch (error) {
        console.error(`Error uploading batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      }
      
      // Wait between batches to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Upload completed. Total users uploaded: ${uploaded}`);
    
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

function readCSVFile(filePath, subscriptionType) {
  return new Promise((resolve, reject) => {
    const users = [];
    
    fs.createReadStream(filePath)
      .pipe(parse({ 
        headers: true, 
        skip_empty_lines: true,
        trim: true 
      }))
      .on('data', (data) => {
        const email = data.email?.trim().toLowerCase();
        if (email && email.includes('@')) {
          users.push({
            email: email,
            subscription_type: subscriptionType,
            name: data.name || '',
            created_at: new Date().toISOString()
          });
        }
      })
      .on('end', () => resolve(users))
      .on('error', reject);
  });
}

uploadUsersToProduction();