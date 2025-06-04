#!/usr/bin/env node

/**
 * Production verification script for admin dashboard fix
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function verifyProductionFix() {
  console.log('🔍 Verifying production admin dashboard fix...');
  
  try {
    // Test production endpoint
    const { stdout } = await execAsync('curl -s "https://start.kasina.app/api/admin/whitelist-direct"');
    const response = JSON.parse(stdout);
    
    if (response.totalUsers && response.totalUsers > 0) {
      console.log(`✅ Production fix successful: ${response.totalUsers} users detected`);
      console.log(`📊 Breakdown: ${response.freemiumUsers} freemium, ${response.premiumUsers} premium, ${response.adminUsers} admin`);
      return true;
    } else {
      console.log('❌ Production still showing issues');
      console.log('Response:', JSON.stringify(response, null, 2));
      return false;
    }
    
  } catch (error) {
    console.log('❌ Production verification failed:', error.message);
    return false;
  }
}

// Run verification
verifyProductionFix().then(success => {
  if (success) {
    console.log('🎯 Admin dashboard should now display all users correctly');
  } else {
    console.log('⚠️  Production deployment may still be in progress');
    console.log('💡 Wait 2-3 minutes and refresh start.kasina.app/admin');
  }
});