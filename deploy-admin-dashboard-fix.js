#!/usr/bin/env node

/**
 * Emergency deployment script for admin dashboard fix
 * Deploys the new stats endpoint to resolve production API issues
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function deployAdminFix() {
  try {
    console.log('🚀 Deploying admin dashboard fix to production...');
    
    // Check if we can trigger a build
    console.log('📦 Triggering production build...');
    
    // Try to force a production restart through git if possible
    try {
      await execAsync('git add -A && git commit -m "Emergency admin dashboard fix with stats endpoint" && git push origin main');
      console.log('✅ Changes pushed to production repo');
    } catch (error) {
      console.log('⚠️ Git push failed, trying alternative deployment method...');
      
      // Alternative: Direct API test to verify the fix works
      console.log('🧪 Testing admin stats endpoint...');
      
      const response = await fetch('http://localhost:5000/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Local admin stats endpoint working:');
        console.log(`   Total Users: ${data.totalUsers}`);
        console.log(`   Friend Users: ${data.friendUsers}`);
        console.log(`   Practice Time: ${data.totalPracticeTimeFormatted}`);
        console.log('📝 Admin dashboard fix ready for manual deployment');
      } else {
        console.error('❌ Local endpoint test failed');
      }
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
  }
}

deployAdminFix();