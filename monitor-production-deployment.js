#!/usr/bin/env node

async function monitorProductionDeployment() {
  console.log('📊 Production Deployment Monitor');
  console.log('Waiting for deployment to complete...');
  
  const productionUrl = 'https://start.kasina.app';
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\nAttempt ${attempts}/${maxAttempts} - Testing admin endpoint...`);
    
    try {
      const response = await fetch(`${productionUrl}/api/emergency-admin`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        console.log('✅ Admin endpoint responding');
        console.log(`Users: ${data.totalUsers} (${data.freemiumUsers} freemium, ${data.premiumUsers} premium, ${data.adminUsers} admin)`);
        console.log(`Practice Time: ${data.totalPracticeTimeFormatted}`);
        console.log(`Source: ${data.source}`);
        
        if (data.totalUsers > 1000) {
          console.log('🎉 SUCCESS: Dynamic database access working in production!');
          console.log('Admin dashboard should now display all user data correctly.');
          return;
        } else {
          console.log('⚠️ Low user count - deployment may not be complete yet');
        }
      } else {
        console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
        
        if (response.status === 500) {
          const errorText = await response.text();
          console.log('Error details:', errorText.substring(0, 200));
        }
      }
      
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
    
    if (attempts < maxAttempts) {
      console.log('Waiting 10 seconds before next attempt...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log('⏰ Monitoring timeout reached. Manual verification needed.');
}

// Add fetch for Node.js environments
if (typeof fetch === 'undefined') {
  global.fetch = (await import('node-fetch')).default;
}

monitorProductionDeployment();