#!/usr/bin/env node

import fetch from 'node-fetch';

async function testProductionNathan() {
  try {
    console.log('Testing production API for Nathan visibility...');
    
    // Try multiple production endpoints to see which one shows Nathan
    const endpoints = [
      'https://start.kasina.app/api/emergency-admin',
      'https://start.kasina.app/api/admin/whitelist-direct'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\nTesting ${endpoint}...`);
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          console.log(`Failed: ${response.status} ${response.statusText}`);
          continue;
        }
        
        const data = await response.json();
        console.log(`Total users: ${data.totalUsers || data.members?.length || 'unknown'}`);
        console.log(`Friend users: ${data.friendUsers || 'unknown'}`);
        
        // Look for Nathan
        const members = data.members || [];
        const nathan = members.find(member => 
          member.email && member.email.toLowerCase().includes('nathan@nathanvansynder.com')
        );
        
        if (nathan) {
          console.log('✅ NATHAN FOUND!');
          console.log(`  Email: ${nathan.email}`);
          console.log(`  Status: ${nathan.status}`);
          console.log(`  Practice: ${nathan.practiceTimeFormatted || 'N/A'}`);
          return true;
        } else {
          console.log('❌ Nathan not found in this endpoint');
          
          // Show sample Friend users
          const friendUsers = members.filter(m => m.status === 'Friend');
          console.log(`Friend users found: ${friendUsers.length}`);
          if (friendUsers.length > 0) {
            console.log('Sample Friend users:');
            friendUsers.slice(0, 3).forEach(user => {
              console.log(`  - ${user.email}`);
            });
          }
        }
        
      } catch (error) {
        console.log(`Error testing ${endpoint}: ${error.message}`);
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('Production test failed:', error.message);
    return false;
  }
}

testProductionNathan();