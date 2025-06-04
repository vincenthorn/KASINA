#!/usr/bin/env node

async function checkDeploymentStatus() {
  const productionUrl = 'https://start.kasina.app';
  
  console.log('Checking deployment status...');
  
  try {
    const response = await fetch(`${productionUrl}/api/emergency-admin`);
    const text = await response.text();
    
    if (text.startsWith('<!DOCTYPE html>')) {
      console.log('Status: Still deploying (serving frontend)');
      return false;
    }
    
    if (text.startsWith('{')) {
      const data = JSON.parse(text);
      console.log('Status: API live - deployment complete');
      console.log(`Users loaded: ${data.totalUsers}`);
      console.log(`Data source: ${data.source}`);
      
      if (data.totalUsers > 1000) {
        console.log('SUCCESS: Dynamic database access working');
        return true;
      } else {
        console.log('WARNING: Low user count - possible database issue');
        return false;
      }
    }
    
    console.log('Status: Unknown response format');
    return false;
    
  } catch (error) {
    console.log(`Status: Error - ${error.message}`);
    return false;
  }
}

// Add fetch for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = (await import('node-fetch')).default;
}

checkDeploymentStatus();