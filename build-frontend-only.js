#!/usr/bin/env node

import { build } from 'vite';
import fs from 'fs';
import path from 'path';

console.log('Building complete frontend for Electron...');

try {
  // Clean the dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  
  // Build only the frontend with optimizations
  await build({
    root: 'client',
    build: {
      outDir: path.resolve('dist'),
      emptyOutDir: true,
      target: 'es2020',
      sourcemap: false,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
            'vendor-ui': ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-button'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-utils': ['zustand', 'clsx', 'tailwind-merge']
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve('client/src'),
        '@shared': path.resolve('shared')
      }
    }
  });

  // Fix paths for Electron
  const indexPath = path.join('dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Replace absolute paths with relative paths for Electron
    indexContent = indexContent.replace(/href="\//g, 'href="./');
    indexContent = indexContent.replace(/src="\//g, 'src="./');
    
    fs.writeFileSync(indexPath, indexContent);
    console.log('Fixed paths for Electron compatibility');
  }

  console.log('Complete frontend build ready for Electron!');
  
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}