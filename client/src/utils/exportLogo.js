// This script creates a KASINA logo with a yellow orb and exports it as a PNG
// Run with Node.js: node exportLogo.js

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create a square canvas
const size = 1024; // Size in pixels
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Yellow color for the KASINA brand (bright yellow)
const yellowColor = '#F9D923';

// Function to render the logo
function renderLogo() {
  // Clear canvas with transparent background
  ctx.clearRect(0, 0, size, size);
  
  // Calculate dimensions
  const orbSize = size * 0.4; // 40% of canvas size
  const orbX = size / 2;
  const orbY = size * 0.35; // Position orb at 35% from top
  
  // Draw orb glow
  const gradient = ctx.createRadialGradient(orbX, orbY, orbSize * 0.4, orbX, orbY, orbSize);
  gradient.addColorStop(0, yellowColor);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbSize, 0, 2 * Math.PI);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Draw solid orb
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbSize * 0.8, 0, 2 * Math.PI);
  ctx.fillStyle = yellowColor;
  ctx.fill();
  
  // Draw KASINA text
  const fontSize = size * 0.14; // 14% of canvas size
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = yellowColor;
  ctx.textBaseline = 'middle';
  
  // Position text below orb
  const textY = size * 0.7; // 70% from top
  ctx.fillText('KASINA', size / 2, textY);
  
  // Save the image
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(__dirname, '../../public/kasina-logo.png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Logo saved to ${outputPath}`);
}

// Execute the function
renderLogo();