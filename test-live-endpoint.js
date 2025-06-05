import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const http = require('http');

// Test the actual running endpoint
const options = {
  hostname: 'localhost',
  port: 5173,
  path: '/api/emergency-admin',
  method: 'GET',
  headers: {
    'User-Agent': 'Test-Script',
    'Cache-Control': 'no-cache'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Raw response:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('Premium users in response:', parsed.premiumUsers);
      console.log('Total users:', parsed.totalUsers);
      console.log('Source:', parsed.source);
    } catch (e) {
      console.log('Failed to parse JSON:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();