import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function forceRenderRestart() {
  console.log('Forcing Render server restart...');
  
  try {
    // Create a meaningless change to force restart
    const timestamp = new Date().toISOString();
    
    // Update package.json with a comment to force rebuild
    const { stdout: packageContent } = await execAsync('cat package.json');
    const packageJson = JSON.parse(packageContent);
    
    // Add a deployment timestamp to force restart
    packageJson._lastDeployment = timestamp;
    
    await execAsync(`echo '${JSON.stringify(packageJson, null, 2)}' > package.json`);
    
    // Commit and push to trigger restart
    await execAsync('git add package.json');
    await execAsync(`git commit -m "Force Render restart - ${timestamp}"`);
    await execAsync('git push origin main');
    
    console.log('Restart triggered successfully');
    console.log('Wait 3-5 minutes for Render to restart with updated admin dashboard');
    
  } catch (error) {
    console.error('Force restart failed:', error.message);
    
    console.log('\nManual restart steps:');
    console.log('1. Go to your Render dashboard');
    console.log('2. Find the KASINA service');
    console.log('3. Click "Manual Deploy" or "Restart"');
    console.log('4. Wait for deployment to complete');
    console.log('5. Refresh start.kasina.app/admin');
  }
}

forceRenderRestart();