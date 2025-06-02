# Electron Desktop App Setup

## Why Electron for Your Meditation App?

This Electron wrapper eliminates the browser timeout issues you've been experiencing. Your meditation sessions can now run indefinitely without platform interruptions.

## Benefits

- **No Browser Timeouts**: Native app eliminates the 287-second crash issue
- **Fullscreen Support**: Immersive meditation experience
- **Hardware Acceleration**: Optimized WebGL performance for your visual kasinas
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Offline Capable**: No internet required after installation

## Quick Start

### 1. Build the React App First
```bash
# From the main project directory
npm run build
```

### 2. Install Electron Dependencies
```bash
cd electron
npm install
```

### 3. Run in Development Mode
```bash
# Still in electron directory
npm run electron:dev
```

### 4. Build for Production
```bash
# Build distributable packages
npm run build

# Or build for specific platforms:
npm run build:win    # Windows
npm run build:mac    # macOS  
npm run build:linux  # Linux
```

## Development Workflow

1. Make changes to your React app in the main project
2. Run `npm run build` to create the dist folder
3. Run `npm run electron:dev` from the electron directory to test

## Distribution

The built apps will be in the `electron/release` directory and can be distributed to users without requiring them to have a browser or deal with web-based limitations.

## Key Features for Meditation

- **backgroundThrottling: false** - Prevents the app from being throttled during long sessions
- **hardwareAcceleration: true** - Ensures smooth WebGL rendering
- **fullscreenable: true** - Allows immersive fullscreen meditation
- **autoHideMenuBar: true** - Clean, distraction-free interface

Your meditation app will now run as smoothly as any native desktop application, with unlimited session duration.