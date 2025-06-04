// Force deployment trigger - updates timestamp to trigger Render auto-deploy
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagePath = path.join(__dirname, 'package.json');
const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Update deployment timestamp
packageData.deploymentTimestamp = new Date().toISOString();

fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2));

console.log('Deployment trigger updated:', packageData.deploymentTimestamp);
console.log('This should trigger a new Render deployment with the database fixes');