#!/usr/bin/env node

import fs from 'fs';

function checkBuildStatus() {
  console.log('Checking build status...');
  
  // Check if build process is still running
  try {
    const { execSync } = require('child_process');
    const processes = execSync('ps aux | grep -v grep | grep -E "(npm.*build|long-build)"').toString();
    if (processes.trim()) {
      console.log('✨ Build is still running...');
    } else {
      console.log('📋 Build process completed');
    }
  } catch (e) {
    console.log('📋 No active build processes found');
  }
  
  // Check status log
  if (fs.existsSync('build-status.log')) {
    const status = fs.readFileSync('build-status.log', 'utf8');
    const lines = status.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      console.log('\nLatest status:');
      console.log(lines.slice(-5).join('\n'));
    }
  }
  
  // Check dist folder
  if (fs.existsSync('dist')) {
    const files = fs.readdirSync('dist');
    console.log(`\n📁 Current dist/ folder: ${files.length} files`);
    
    // Look for key files that indicate completion
    const hasIndex = files.includes('index.html');
    const hasAssets = files.some(f => f.startsWith('assets'));
    
    if (hasIndex && hasAssets) {
      console.log('✅ Build appears complete with index.html and assets!');
      console.log('Ready for Electron packaging');
    } else if (hasIndex) {
      console.log('⏳ Partial build - index.html exists, assets may still be building');
    } else {
      console.log('⏳ Build in progress...');
    }
  } else {
    console.log('⏳ Build hasn\'t created dist folder yet');
  }
}

checkBuildStatus();