#!/bin/bash

# Manual deployment script for admin dashboard fix
echo "🚀 Manual deployment starting..."

# Add all changes
git add .

# Commit with timestamp to force new deployment
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
git commit -m "Fix admin dashboard production schema compatibility - Deploy $TIMESTAMP"

# Push to trigger Render deployment
git push origin main

echo "✅ Deployment triggered"
echo "⏱️  Allow 2-3 minutes for Render to process"
echo "🔄 Then refresh start.kasina.app/admin"

# Test production endpoint after delay
echo "⏳ Waiting 30 seconds before testing..."
sleep 30

echo "🧪 Testing production endpoint..."
curl -s "https://start.kasina.app/api/admin/whitelist-direct" | grep -o '"totalUsers":[0-9]*' || echo "Still deploying..."