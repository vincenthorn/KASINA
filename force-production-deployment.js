#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function forceProductionDeployment() {
  console.log('Forcing production deployment to fix Nathan display issue...');
  
  try {
    // Create a deployment trigger commit
    const timestamp = new Date().toISOString();
    const commitMessage = `Fix admin dashboard Friend user display - ${timestamp}`;
    
    console.log('Creating deployment commit...');
    await execAsync('git add .');
    await execAsync(`git commit -m "${commitMessage}"`);
    await execAsync('git push origin main');
    
    console.log('Deployment triggered - checking status...');
    
    // Wait for deployment to complete
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Deployment check ${attempts + 1}/${maxAttempts}...`);
        
        const response = await fetch('https://start.kasina.app/api/emergency-admin');
        const data = await response.json();
        
        // Check if Nathan is now in the response
        const nathan = data.members?.find(member => 
          member.email.toLowerCase().includes('nathan@nathanvansynder.com')
        );
        
        if (nathan) {
          console.log('SUCCESS: Nathan now appears in admin dashboard!');
          console.log(`Nathan status: ${nathan.status}`);
          console.log(`Friend users count: ${data.friendUsers}`);
          return true;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          console.log('Nathan not yet visible, waiting 30 seconds...');
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
        
      } catch (error) {
        console.log(`Check failed: ${error.message}, retrying...`);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }
    
    console.log('Deployment completed but Nathan still not visible');
    return false;
    
  } catch (error) {
    console.error('Deployment failed:', error.message);
    return false;
  }
}

// Add fetch for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = (await import('node-fetch')).default;
}

forceProductionDeployment();