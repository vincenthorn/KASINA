# KASINA Render Deployment Guide

## Current Status
✅ Project structure ready for Render
✅ Build scripts configured in package.json
✅ Vite config outputs to dist/public for Express serving

## Deployment Steps

### 1. Create PostgreSQL Database on Render
1. Go to https://dashboard.render.com
2. Click "New +" → "PostgreSQL"
3. Name: `kasina-production-db`
4. Region: Choose closest to your users
5. Save the DATABASE_URL provided

### 2. Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configuration:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
   - **Region**: Same as database

### 3. Environment Variables
Add these in Render dashboard:
```
DATABASE_URL=<from step 1>
SESSION_SECRET=<generate strong random string>
NODE_ENV=production
```

### 4. Auto-Deploy Setup
- Branch: `main` (or your preferred branch)
- Auto-Deploy: Enabled
- Build & Deploy: Automatic on git push

## Testing the 5-Minute Crash Fix
Once deployed on Render:
- The platform timeout issues may be resolved
- Test meditation sessions past 5 minutes
- Monitor crash logs via Render dashboard

## Development Workflow
1. Code in Replit as usual
2. Push changes to GitHub
3. Render auto-deploys from GitHub
4. Test production deployment for crash resolution

## Notes
- Render provides better resource management than Replit hosting
- No 5-minute platform timeouts that caused systematic crashes
- Full PostgreSQL management included
- SSL/HTTPS automatic