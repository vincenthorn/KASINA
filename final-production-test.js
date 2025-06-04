#!/usr/bin/env node

async function testProductionAdmin() {
  const productionUrl = 'https://start.kasina.app';
  
  try {
    const response = await fetch(`${productionUrl}/api/emergency-admin`);
    
    if (!response.ok) {
      console.log(`HTTP ${response.status}: ${response.statusText}`);
      return false;
    }
    
    const text = await response.text();
    
    if (text.startsWith('<!DOCTYPE html>')) {
      console.log('Deployment still in progress - serving frontend');
      return false;
    }
    
    const data = JSON.parse(text);
    
    console.log('Production Admin Dashboard Test Results:');
    console.log(`Total Users: ${data.totalUsers}`);
    console.log(`Freemium: ${data.freemiumUsers}`);
    console.log(`Admin: ${data.adminUsers}`);
    console.log(`Total Practice Time: ${data.totalPracticeTimeFormatted}`);
    console.log(`Data Source: ${data.source}`);
    console.log(`Timestamp: ${data.timestamp}`);
    
    if (data.totalUsers > 1000) {
      console.log('SUCCESS: Dynamic database access working in production');
      console.log('Admin dashboard will display real-time user data');
      return true;
    } else {
      console.log('WARNING: User count unexpectedly low');
      return false;
    }
    
  } catch (error) {
    console.log(`Test failed: ${error.message}`);
    return false;
  }
}

// Add fetch for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = (await import('node-fetch')).default;
}

testProductionAdmin();