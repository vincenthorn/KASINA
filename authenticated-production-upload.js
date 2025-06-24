import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';

async function authenticatedUpload() {
  try {
    console.log('Authenticating as admin on production...');
    
    // Step 1: Login as admin to get session cookie
    const loginResponse = await fetch('https://start.kasina.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@kasina.app'
      })
    });

    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login response:', loginResponse.status);
    
    if (!cookies) {
      console.error('No session cookie received');
      return;
    }

    // Extract session cookie
    const sessionCookie = cookies.split(';')[0];
    console.log('Session cookie obtained');

    // Step 2: Upload CSV using authenticated session
    const form = new FormData();
    form.append('csv', fs.createReadStream('attached_assets/s1EdNrH8TrOz50GphmY4Yw_1750784550768.csv'));
    form.append('userType', 'freemium');
    
    console.log('Uploading CSV with admin session...');
    
    const uploadResponse = await fetch('https://start.kasina.app/api/admin/upload-whitelist-new', {
      method: 'POST',
      body: form,
      headers: {
        'Cookie': sessionCookie,
        ...form.getHeaders()
      }
    });

    const uploadResult = await uploadResponse.text();
    console.log('Upload status:', uploadResponse.status);
    
    if (uploadResponse.ok) {
      console.log('Upload successful!');
      console.log('Result:', uploadResult.substring(0, 200));
    } else {
      console.error('Upload failed:', uploadResult.substring(0, 200));
    }

    // Step 3: Check final status
    setTimeout(async () => {
      const statusResponse = await fetch('https://start.kasina.app/api/emergency-admin', {
        headers: { 'X-Admin-Key': 'kasina_admin_2024' }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('\nFinal production status:');
        console.log(`Total users: ${statusData.totalUsers}`);
        console.log(`Freemium users: ${statusData.freemiumUsers}`);
        console.log(`Premium users: ${statusData.premiumUsers}`);
        
        const increase = statusData.freemiumUsers - 1444;
        console.log(`Freemium users increased by: ${increase}`);
      }
    }, 5000);

  } catch (error) {
    console.error('Upload failed:', error.message);
  }
}

authenticatedUpload();