import fs from 'fs';
import { parse } from 'csv-parse';
import fetch from 'node-fetch';

async function simpleProductionImport() {
  try {
    console.log('Reading CSV for direct import to production...');
    
    // Parse CSV
    const csvData = fs.readFileSync('attached_assets/s1EdNrH8TrOz50GphmY4Yw_1750784550768.csv', 'utf8');
    const records = await new Promise((resolve, reject) => {
      parse(csvData, { columns: true, skip_empty_lines: true, trim: true }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    console.log(`Processing ${records.length} CSV records`);

    // Extract valid emails
    const validEmails = [];
    for (const record of records) {
      const email = record.Email?.toLowerCase().trim();
      if (email && email !== 'email' && email.includes('@') && !email.includes(' ')) {
        validEmails.push(email);
      }
    }

    console.log(`Found ${validEmails.length} valid emails to import`);

    // Import using individual API calls (since bulk endpoint doesn't exist)
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < validEmails.length; i++) {
      const email = validEmails[i];
      
      try {
        const response = await fetch('https://start.kasina.app/api/admin/direct-user-add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': 'kasina_admin_2024'
          },
          body: JSON.stringify({
            email: email,
            subscription_type: 'freemium'
          })
        });

        const result = await response.text();
        
        if (response.ok) {
          imported++;
          if (imported % 100 === 0) {
            console.log(`Progress: ${imported}/${validEmails.length} users imported`);
          }
        } else if (result.includes('duplicate') || result.includes('exists')) {
          skipped++;
        } else {
          console.error(`Failed to import ${email}: ${response.status} - ${result}`);
          failed++;
        }
        
        // Small delay to avoid overwhelming the server
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`Error importing ${email}:`, error.message);
        failed++;
      }
    }

    console.log(`Import completed:`);
    console.log(`- Imported: ${imported} users`);
    console.log(`- Skipped (duplicates): ${skipped} users`);
    console.log(`- Failed: ${failed} users`);

    // Check final status
    const finalCheck = await fetch('https://start.kasina.app/api/emergency-admin', {
      headers: { 'X-Admin-Key': 'kasina_admin_2024' }
    });

    if (finalCheck.ok) {
      const finalData = await finalCheck.json();
      console.log(`Final production status:`);
      console.log(`- Total users: ${finalData.totalUsers}`);
      console.log(`- Freemium users: ${finalData.freemiumUsers}`);
      console.log(`- Premium users: ${finalData.premiumUsers}`);
    }

  } catch (error) {
    console.error('Import failed:', error.message);
  }
}

simpleProductionImport();