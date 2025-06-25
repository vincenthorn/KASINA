#!/usr/bin/env node

import fetch from 'node-fetch';

async function testAdminApi() {
  try {
    console.log('Testing production admin API...');
    
    const response = await fetch('https://start.kasina.app/api/emergency-admin');
    const data = await response.json();
    
    console.log('API Response Summary:');
    console.log(`Total Users: ${data.totalUsers}`);
    console.log(`Friend Users: ${data.friendUsers}`);
    console.log(`Members Array Length: ${data.members?.length}`);
    
    // Find Nathan specifically
    const nathan = data.members?.find(member => 
      member.email.toLowerCase().includes('nathan@nathanvansynder.com')
    );
    
    if (nathan) {
      console.log('\nNathan FOUND in API response:');
      console.log(`Email: ${nathan.email}`);
      console.log(`Status: ${nathan.status}`);
      console.log(`Practice Time: ${nathan.practiceTimeFormatted}`);
    } else {
      console.log('\nNathan NOT FOUND in API response');
      
      // Check if any Friend users are in the response
      const friendUsers = data.members?.filter(member => member.status === 'Friend');
      console.log(`\nFriend users in API response: ${friendUsers?.length || 0}`);
      
      if (friendUsers && friendUsers.length > 0) {
        console.log('Friend users found:');
        friendUsers.forEach(user => {
          console.log(`  ${user.email} - ${user.status}`);
        });
      }
    }
    
  } catch (error) {
    console.error('API test failed:', error.message);
  }
}

testAdminApi();