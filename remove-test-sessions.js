import fs from 'fs';

// Read the current sessions data
const sessions = JSON.parse(fs.readFileSync('./server-sessions.json', 'utf8'));
console.log(`Loaded ${sessions.length} total sessions`);

// Filter out the sessions with carl.gregg@gmail.com or carlgregg@gmail.com email
const filteredSessions = sessions.filter(session => {
  const email = session.userEmail?.toLowerCase();
  return email !== 'carl.gregg@gmail.com' && email !== 'carlgregg@gmail.com';
});

console.log(`Removed ${sessions.length - filteredSessions.length} sessions from carl.gregg@gmail.com`);
console.log(`Keeping ${filteredSessions.length} sessions`);

// Create a backup of the current file
fs.copyFileSync('./server-sessions.json', './server-sessions.backup.json');
console.log('Created backup at server-sessions.backup.json');

// Write the filtered sessions back to the file
fs.writeFileSync('./server-sessions.json', JSON.stringify(filteredSessions, null, 2), 'utf8');
console.log('Updated server-sessions.json with filtered sessions');