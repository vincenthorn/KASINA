#!/usr/bin/env node

import fetch from 'node-fetch';

async function verifyProductionAdmin() {
  console.log('🔍 Verifying Production Admin Dashboard...');
  
  const productionUrl = 'https://start.kasina.app';
  
  try {
    // Test the emergency admin endpoint in production
    console.log('Testing emergency admin endpoint...');
    const response = await fetch(`${productionUrl}/api/emergency-admin`);
    
    if (!response.ok) {
      console.log(`❌ Emergency endpoint failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('Error response:', errorText.substring(0, 200));
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ Production admin endpoint working!');
    console.log(`Total Users: ${data.totalUsers}`);
    console.log(`Freemium: ${data.freemiumUsers}`);
    console.log(`Premium: ${data.premiumUsers}`);
    console.log(`Admin: ${data.adminUsers}`);
    console.log(`Total Practice Time: ${data.totalPracticeTimeFormatted}`);
    console.log(`Data Source: ${data.source}`);
    console.log(`Timestamp: ${data.timestamp}`);
    
    // Verify the data is real and not empty
    if (data.totalUsers > 1000 && data.freemiumUsers > 1000) {
      console.log('✅ Dynamic database access confirmed - all users loaded');
    } else {
      console.log('⚠️ User count seems low - may still have database issues');
    }
    
  } catch (error) {
    console.error('❌ Production verification failed:', error.message);
  }
}

verifyProductionAdmin();