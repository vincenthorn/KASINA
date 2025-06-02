#!/bin/bash

echo "Starting extended build process..."
echo "Started at: $(date)"

# Run the build with extended timeout
timeout 1800 npm run build > build-output.log 2>&1

EXIT_CODE=$?

echo "Build finished at: $(date)"
echo "Exit code: $EXIT_CODE"

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "Checking dist folder..."
    ls -la dist/
    echo ""
    echo "Build is ready for Electron packaging!"
elif [ $EXIT_CODE -eq 124 ]; then
    echo "⏰ Build timed out after 30 minutes"
    echo "Last few lines of output:"
    tail -n 10 build-output.log
else
    echo "❌ Build failed"
    echo "Last few lines of output:"
    tail -n 10 build-output.log
fi