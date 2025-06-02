// Test script to verify session configuration
console.log('Session Configuration Test:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Cookie secure setting:', process.env.NODE_ENV === "production");
console.log('Recommended: Set secure to false for testing');

// Alternative session config for Render
const sessionConfig = {
  secret: process.env.SESSION_SECRET || "kasina-meditation-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // For Render testing
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  }
};

console.log('Recommended session config:', JSON.stringify(sessionConfig, null, 2));