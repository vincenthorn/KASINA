#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔧 Setting up Electron configuration...');

// Create electron directory structure
const electronDir = 'electron';
if (!fs.existsSync(electronDir)) {
  fs.mkdirSync(electronDir, { recursive: true });
}

// Electron main process file
const electronMain = `const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the browser window optimized for meditation
  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      // Enable hardware acceleration for WebGL
      hardwareAcceleration: true,
      // Prevent throttling for long meditation sessions
      backgroundThrottling: false
    },
    // Start in fullscreen for immersive meditation
    fullscreen: false,
    // Allow user to toggle fullscreen
    fullscreenable: true,
    // Remove menu bar for cleaner interface
    autoHideMenuBar: true,
    // Dark theme for meditation app
    titleBarStyle: 'hidden',
    show: false // Don't show until ready
  });

  // Load the built React app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Optional: Start in fullscreen for meditation sessions
    // mainWindow.setFullScreen(true);
  });

  // Prevent external navigation for security
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:5173' && !isDev) {
      event.preventDefault();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    // Dereference the window object
    mainWindow = null;
  });

  return mainWindow;
}

// App event listeners
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, apps typically stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});
`;

// Write the main Electron file
fs.writeFileSync(path.join(electronDir, 'main.js'), electronMain);

console.log('✅ Electron main.js created');