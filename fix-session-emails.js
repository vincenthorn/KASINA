// Script to fix session data by adding missing userEmail fields
import fs from 'fs';

// Define the path to the sessions file
const sessionsPath = './server-sessions.json';

// Define default user emails to associate with sessions that don't have one
// In a production environment, you would have a more sophisticated mapping
const defaultUserEmails = {
  // List of users who've logged meditation sessions
  "user1": "user@kasina.app",
  "user2": "premium@kasina.app",
  "admin": "admin@kasina.app"
};

// Read the current sessions data
console.log(`Reading sessions from ${sessionsPath}...`);
const sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));

console.log(`Loaded ${sessions.length} total sessions`);

// Count sessions without userEmail field
const sessionsWithoutEmail = sessions.filter(session => !session.userEmail).length;
console.log(`Found ${sessionsWithoutEmail} sessions without userEmail`);

// Create a backup of the current file
const backupPath = `${sessionsPath}.backup-${Date.now()}`;
fs.copyFileSync(sessionsPath, backupPath);
console.log(`Created backup at ${backupPath}`);

// Update sessions without userEmail field
// For this simple fix, assign all missing sessions to the test user
let updatedCount = 0;
const updatedSessions = sessions.map(session => {
  if (!session.userEmail) {
    updatedCount++;
    return {
      ...session,
      userEmail: defaultUserEmails.user1 // Default to regular user for missing emails
    };
  }
  return session;
});

console.log(`Fixed ${updatedCount} sessions by adding userEmail field`);

// Write the updated sessions back to the file
fs.writeFileSync(sessionsPath, JSON.stringify(updatedSessions, null, 2), 'utf8');
console.log(`Updated ${sessionsPath} with fixed session data`);

console.log('Done! You should now see practice time for users in the Admin Dashboard.');