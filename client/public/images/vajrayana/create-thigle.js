// This file creates a proper White A Thigle with concentric rainbow rings
// Run with: node create-thigle.js

const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a canvas for our image
const size = 512;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Clear background to dark blue
ctx.fillStyle = '#0000cc';
ctx.fillRect(0, 0, size, size);

// Helper to draw a circle
function drawCircle(x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// Center of our concentric circles
const centerX = size / 2;
const centerY = size / 2;

// Draw the concentric rings from outside in
// Yellow ring
drawCircle(centerX, centerY, size * 0.4, '#ffff00');

// Red ring
drawCircle(centerX, centerY, size * 0.32, '#ff0000');

// White ring
drawCircle(centerX, centerY, size * 0.24, '#ffffff');

// Green ring
drawCircle(centerX, centerY, size * 0.18, '#00cc00');

// Blue center
drawCircle(centerX, centerY, size * 0.13, '#0044ff');

// Draw the Tibetan "A" character in white
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 80px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('ཨ', centerX, centerY); // Tibetan "A" character

// Save to PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('./client/public/images/vajrayana/white-a-thigle-perfect.png', buffer);

console.log('White A Thigle image created successfully!');