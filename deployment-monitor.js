#!/usr/bin/env node

async function monitorDeployment() {
  const productionUrl = 'https://start.kasina.app';
  const checkInterval = 15000; // 15 seconds
  const maxChecks = 40; // 10 minutes total
  
  console.log('Monitoring Render deployment progress...');
  
  for (let attempt = 1; attempt <= maxChecks; attempt++) {
    console.log(`\nCheck ${attempt}/${maxChecks} - ${new Date().toLocaleTimeString()}`);
    
    try {
      const response = await fetch(`${productionUrl}/api/emergency-admin`);
      const responseText = await response.text();
      
      // Check if we're getting HTML (still deploying) or JSON (deployment complete)
      if (responseText.startsWith('<!DOCTYPE html>')) {
        console.log('Status: Deployment in progress (serving frontend)');
      } else if (responseText.startsWith('{')) {
        console.log('Status: API endpoints live - deployment complete');
        
        try {
          const data = JSON.parse(responseText);
          console.log(`Users loaded: ${data.totalUsers}`);
          console.log(`Data source: ${data.source}`);
          
          if (data.totalUsers > 1000) {
            console.log('SUCCESS: Dynamic database access confirmed in production');
            console.log('Admin dashboard should now display all user data correctly');
            return true;
          }
        } catch (parseError) {
          console.log('Status: API responding but data format unexpected');
        }
      } else if (response.status >= 500) {
        console.log(`Status: Server error ${response.status} - checking deployment logs`);
      } else {
        console.log(`Status: Unexpected response (${response.status})`);
      }
      
    } catch (error) {
      console.log(`Status: Connection error - ${error.message}`);
    }
    
    if (attempt < maxChecks) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }
  
  console.log('\nMonitoring timeout reached. Manual verification recommended.');
  return false;
}

// Add fetch for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = (await import('node-fetch')).default;
}

monitorDeployment();