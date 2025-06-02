#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔨 Building React app for Electron...');

// Step 1: Build the React app
console.log('📦 Building React application...');
const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ React build failed');
    process.exit(1);
  }
  
  console.log('✅ React build complete');
  
  // Step 2: Fix paths for Electron
  console.log('🔧 Fixing paths for Electron...');
  
  const indexPath = path.join('dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Replace absolute paths with relative paths
    indexContent = indexContent.replace(/href="\//g, 'href="./');
    indexContent = indexContent.replace(/src="\//g, 'src="./');
    
    fs.writeFileSync(indexPath, indexContent);
    console.log('✅ Paths fixed in index.html');
  }
  
  console.log('🚀 Ready for Electron!');
  console.log('');
  console.log('Next steps:');
  console.log('1. cd electron');
  console.log('2. npm install');
  console.log('3. npm run electron:dev');
});

buildProcess.on('error', (err) => {
  console.error('❌ Build process error:', err);
  process.exit(1);
});