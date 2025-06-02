#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('Creating minimal dist folder for Electron...');

// Create dist directory
const distDir = 'dist';
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Create a basic index.html that will work with Electron
const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kasina Meditation</title>
    <style>
      body {
        margin: 0;
        padding: 20px;
        font-family: system-ui, -apple-system, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
      }
      .container {
        text-align: center;
        max-width: 600px;
      }
      h1 {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      }
      p {
        font-size: 1.2rem;
        line-height: 1.6;
        margin-bottom: 2rem;
        opacity: 0.9;
      }
      .status {
        background: rgba(255,255,255,0.1);
        padding: 1rem;
        border-radius: 8px;
        backdrop-filter: blur(10px);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Kasina Meditation</h1>
      <p>Your mindfulness platform is ready for Electron packaging.</p>
      <div class="status">
        <p><strong>Status:</strong> Ready for full build process</p>
        <p>This is a placeholder that demonstrates the Electron setup is working.</p>
        <p>Run the full build process to get your complete application.</p>
      </div>
    </div>
  </body>
</html>`;

fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);

console.log('✅ Created dist/index.html');
console.log('📁 Your dist/ folder is ready for Electron!');
console.log('');
console.log('Next steps:');
console.log('1. cd electron');
console.log('2. npm install');
console.log('3. npm run electron:dev');
console.log('');
console.log('For the full application build, run: npm run build');
console.log('(This may take several minutes due to Three.js dependencies)');