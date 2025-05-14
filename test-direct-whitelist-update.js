// Test the whitelist update function directly
import fs from 'fs';
import { updateWhitelistFromCSV } from './server/routes.js';

async function runTest() {
  try {
    console.log("Testing direct whitelist update...");
    
    // First, make a backup of the current whitelist
    const currentWhitelist = fs.readFileSync('./whitelist.csv', 'utf-8');
    fs.writeFileSync('./whitelist.csv.test-backup', currentWhitelist);
    console.log("Created backup at whitelist.csv.test-backup");
    
    // Read our test CSV
    const testCsvData = fs.readFileSync('./test-whitelist-update.csv');
    
    // Call the function with our test data
    console.log("Calling updateWhitelistFromCSV with test data...");
    const updatedEmails = await updateWhitelistFromCSV(testCsvData);
    
    console.log(`\nUpdated whitelist now has ${updatedEmails.length} emails`);
    console.log("\nVerifying that premium users were preserved:");
    
    // Check if our protected emails are in the result
    const premiumEmails = [
      "brian@terma.asia", 
      "emilywhorn@gmail.com", 
      "ryan@ryanoelke.com"
    ];
    
    let allPreserved = true;
    for (const email of premiumEmails) {
      const isPreserved = updatedEmails.includes(email);
      console.log(`- ${email}: ${isPreserved ? 'PRESERVED ✓' : 'MISSING ✗'}`);
      if (!isPreserved) allPreserved = false;
    }
    
    // Also check admin and test users
    for (const email of ["admin@kasina.app", "user@kasina.app"]) {
      const isPreserved = updatedEmails.includes(email);
      console.log(`- ${email}: ${isPreserved ? 'PRESERVED ✓' : 'MISSING ✗'}`);
      if (!isPreserved) allPreserved = false;
    }
    
    if (allPreserved) {
      console.log("\n✅ TEST PASSED: All protected emails were preserved");
    } else {
      console.log("\n❌ TEST FAILED: Some protected emails were not preserved");
    }
    
    // Restore the original whitelist
    fs.writeFileSync('./whitelist.csv', currentWhitelist);
    console.log("\nRestored original whitelist");
    
  } catch (error) {
    console.error("Error during test:", error);
    
    // Try to restore whitelist from backup
    try {
      if (fs.existsSync('./whitelist.csv.test-backup')) {
        const backup = fs.readFileSync('./whitelist.csv.test-backup', 'utf-8');
        fs.writeFileSync('./whitelist.csv', backup);
        console.log("Restored whitelist from backup after error");
      }
    } catch (restoreError) {
      console.error("Failed to restore whitelist:", restoreError);
    }
  }
}

runTest();