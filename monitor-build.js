#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';

console.log('Starting monitored build process...');
console.log('Build started at:', new Date().toLocaleTimeString());

const buildProcess = spawn('npm', ['run', 'build'], { 
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: false
});

let output = '';

buildProcess.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  
  // Log progress indicators
  if (text.includes('transforming')) {
    const match = text.match(/transforming \((\d+)\)/);
    if (match) {
      console.log(`Progress: Transforming ${match[1]} modules...`);
    }
  }
  
  if (text.includes('✓')) {
    console.log('Build step completed:', text.trim());
  }
});

buildProcess.stderr.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log('Build info:', text.trim());
});

buildProcess.on('close', (code) => {
  const timestamp = new Date().toLocaleTimeString();
  
  if (code === 0) {
    console.log(`\n✅ Build completed successfully at ${timestamp}!`);
    
    // Check what was built
    if (fs.existsSync('dist')) {
      const files = fs.readdirSync('dist');
      console.log(`📁 Created ${files.length} files in dist/`);
      console.log('Files:', files.slice(0, 5).join(', ') + (files.length > 5 ? '...' : ''));
    }
    
    console.log('\n🚀 Your complete meditation platform is ready for Electron!');
    console.log('Next steps:');
    console.log('1. cd electron');
    console.log('2. npm install');
    console.log('3. npm run electron:dev');
    
  } else {
    console.log(`\n❌ Build failed at ${timestamp} with code ${code}`);
  }
  
  // Save full output log
  fs.writeFileSync('build-complete.log', output);
});

buildProcess.on('error', (err) => {
  console.error('Build process error:', err);
});