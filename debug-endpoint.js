import fetch from 'node-fetch';

async function debugEndpoint() {
  try {
    const response = await fetch('http://localhost:5173/api/emergency-admin');
    const text = await response.text();
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    console.log('Raw response:', text);
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('\nParsed data:');
      console.log('Total Users:', data.totalUsers);
      console.log('Premium Users:', data.premiumUsers);
      console.log('Freemium Users:', data.freemiumUsers);
      console.log('Admin Users:', data.adminUsers);
      console.log('Source:', data.source);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugEndpoint();