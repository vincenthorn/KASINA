#!/usr/bin/env node

async function verifyProductionReady() {
  const productionUrl = 'https://start.kasina.app';
  
  console.log('Testing production admin dashboard after deployment...');
  
  try {
    // Test emergency admin endpoint
    console.log('Testing /api/emergency-admin...');
    const response = await fetch(`${productionUrl}/api/emergency-admin`);
    
    if (!response.ok) {
      console.log(`Emergency endpoint failed: ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    
    console.log('Production Results:');
    console.log(`Total Users: ${data.totalUsers}`);
    console.log(`Freemium: ${data.freemiumUsers}`);
    console.log(`Premium: ${data.premiumUsers}`);
    console.log(`Admin: ${data.adminUsers}`);
    console.log(`Practice Time: ${data.totalPracticeTimeFormatted}`);
    console.log(`Data Source: ${data.source}`);
    
    // Verify dynamic data is working
    if (data.totalUsers > 1000 && data.source === 'emergency-simplified-queries') {
      console.log('SUCCESS: Dynamic database queries working in production');
      console.log('Admin dashboard will display real-time user data');
      return true;
    } else {
      console.log('ISSUE: User count or data source incorrect');
      return false;
    }
    
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return false;
  }
}

// Add fetch for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = (await import('node-fetch')).default;
}

verifyProductionReady();