# Instructions to Add Nathan to Production Admin Dashboard

## Issue Summary
Nathan (nathan@nathanvansynder.com) needs to be added as a Friend user to the production KASINA platform at start.kasina.app. The development and production databases are separate, so direct database access from the development environment doesn't affect the production dashboard.

## Manual Solution Steps

### Option 1: Admin Dashboard CSV Upload
1. Go to https://start.kasina.app/admin
2. Log in as admin@kasina.app
3. Use the CSV upload feature
4. Create a CSV file with this content:
   ```
   email,subscription_type
   nathan@nathanvansynder.com,friend
   phong@phong.com,friend
   ```
5. Upload the CSV file
6. Both users should appear in the admin dashboard as Friend users

### Option 2: Direct Database Addition (if you have production database access)
If you have direct access to the production database, run this SQL:
```sql
INSERT INTO users (email, subscription_type, created_at, updated_at) 
VALUES ('nathan@nathanvansynder.com', 'friend', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET 
  subscription_type = 'friend', 
  updated_at = NOW();
```

## Verification
After adding Nathan:
1. Refresh the admin dashboard at start.kasina.app/admin
2. Nathan should appear in the user list with "Friend" status
3. Friend users have the same access level as Premium users
4. Nathan can access both Visual and Breath mode kasinas

## Friend User Privileges
Friend subscription type provides:
- Full access to all kasina types (Color, Vajrayana)
- Access to both Visual and Breath modes
- Same functionality as Premium users
- Custom color creation capabilities
- Session tracking and analytics

## Current Status
- Development database: Nathan added as Premium user, Phong updated to Friend user
- Production database: Both users require manual addition via admin interface
- Both databases are separate and independent