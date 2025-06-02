#!/usr/bin/env node

import { build } from 'vite';
import path from 'path';

console.log('🚀 Starting optimized build for Electron...');

try {
  await build({
    root: 'client',
    build: {
      outDir: path.resolve('dist'),
      emptyOutDir: true,
      target: 'es2020',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            three: ['three'],
            icons: ['lucide-react']
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
  
  console.log('✅ Build completed successfully!');
  console.log('📁 Files are ready in the dist/ folder');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}