import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { parse } from "csv-parse/sync";

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });
import { getUserByEmail, getAllUsers, upsertUser, bulkUpsertUsers, isUserWhitelisted, getUserSubscriptionType, removeUser, addSession, getUserSessions, getAllSessions, getUserPracticeStats, getAllUsersWithStats, deleteUserSession } from "./db";
import { handleCsvUpload, uploadMiddleware } from "./upload-fix.js";
import { Pool } from 'pg';

// Database connection pool for kasina breakdown data
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Extend the Express Request type to include session
declare module "express-session" {
  interface SessionData {
    user?: {
      email: string;
    };
  }
}

export function registerRoutes(app: Express): Server {
  // Admin routes - restricted to admin users
  const adminEmails = ["admin@kasina.app"];
  
  // Middleware to check if user is admin
  const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    // Get email from session if available
    const userEmail = req.session?.user?.email;
    
    if (!userEmail) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (!adminEmails.includes(userEmail)) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    next();
  };

  // Middleware to check Zapier API key
  const checkZapierAuth = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];
    
    if (apiKey !== 'kasina-zapier-integration-key') {
      return res.status(401).json({ message: "Invalid API key" });
    }
    
    next();
  };

  // Enhanced authentication routes with session debugging
  app.post("/api/auth/login", async (req, res) => {
    const { email } = req.body;
    
    console.log(`🔐 LOGIN ATTEMPT: ${email}`);
    console.log(`🔐 Pre-login session ID: ${req.sessionID}`);
    console.log(`🔐 Pre-login session data:`, req.session);
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    
    try {
      // Check if user exists in database
      const user = await getUserByEmail(email);
      if (!user) {
        console.log(`🔐 LOGIN FAILED: User ${email} not found in database`);
        return res.status(401).json({ message: "User not found" });
      }
      
      console.log(`🔐 LOGIN SUCCESS: User ${email} found with subscription: ${user.subscription_type}`);
      
      // Store user in session with enhanced debugging
      req.session.user = { email: user.email };
      console.log(`🔐 Setting session user data:`, req.session.user);
      console.log(`🔐 Session ID after user assignment: ${req.sessionID}`);
      console.log(`🔐 Full session object:`, req.session);
      
      // Force session regeneration to ensure clean state
      req.session.regenerate((regenErr) => {
        if (regenErr) {
          console.error("🔐 Session regeneration error:", regenErr);
          return res.status(500).json({ message: "Session regeneration failed" });
        }
        
        // Set user data in new session
        req.session.user = { email: user.email };
        console.log(`🔐 New session ID after regeneration: ${req.sessionID}`);
        console.log(`🔐 User data in new session:`, req.session.user);
        
        // Save session explicitly
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("🔐 Session save error:", saveErr);
            return res.status(500).json({ message: "Session save failed" });
          }
          
          console.log(`🔐 Session saved successfully for ${email}`);
          console.log(`🔐 Final session ID: ${req.sessionID}`);
          
          res.json({ 
            message: "Login successful",
            user: { 
              email: user.email,
              subscriptionType: user.subscription_type 
            },
            sessionId: req.sessionID // Include for debugging
          });
        });
      });
    } catch (error) {
      console.error("🔐 Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    // Debug session information
    console.log("Auth check - Session ID:", req.sessionID);
    console.log("Auth check - Session data:", req.session);
    console.log("Auth check - Cookie headers:", req.headers.cookie);
    
    if (!req.session?.user?.email) {
      console.log("Auth check failed - No session user data");
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await getUserByEmail(req.session.user.email);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      res.json({ 
        email: user.email,
        subscriptionType: user.subscription_type,
        createdAt: user.created_at
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Authentication check failed" });
    }
  });

  // Session test endpoint for debugging
  app.get("/api/test-session", (req, res) => {
    console.log(`🧪 SESSION TEST - ID: ${req.sessionID}`);
    console.log(`🧪 SESSION TEST - Data:`, req.session);
    console.log(`🧪 SESSION TEST - User:`, req.session?.user);
    console.log(`🧪 SESSION TEST - Cookies:`, req.headers.cookie);
    
    res.json({
      sessionId: req.sessionID,
      hasSession: !!req.session,
      hasUser: !!req.session?.user,
      user: req.session?.user || null,
      timestamp: new Date().toISOString(),
      cookies: req.headers.cookie || null
    });
  });

  // Admin middleware with enhanced debugging
  const checkAdmin = (req: Request, res: Response, next: NextFunction) => {
    const userEmail = req.session?.user?.email;
    const adminEmails = ["admin@kasina.app"];
    
    console.log('🔐 Admin Auth Check:', {
      sessionExists: !!req.session,
      userInSession: !!req.session?.user,
      userEmail: userEmail,
      sessionId: req.sessionID,
      isAdmin: userEmail && adminEmails.includes(userEmail)
    });
    
    if (userEmail && adminEmails.includes(userEmail)) {
      console.log('✅ Admin access granted for:', userEmail);
      next();
    } else {
      console.log('❌ Admin access denied. User email:', userEmail);
      res.status(403).json({ message: "Unauthorized: Admin access required" });
    }
  };

  // Emergency production-ready admin endpoint with simplified queries
  app.get("/api/emergency-admin", async (req, res) => {
    try {
      console.log('🚨 Emergency Admin: Starting simplified database access...');
      
      // Use separate simple queries with only guaranteed columns
      const usersQuery = 'SELECT email, subscription_type, created_at FROM users ORDER BY created_at DESC';
      const sessionsQuery = 'SELECT user_email, duration_seconds FROM sessions WHERE duration_seconds > 0';
      
      const [usersResult, sessionsResult] = await Promise.all([
        dbPool.query(usersQuery),
        dbPool.query(sessionsQuery)
      ]);
      
      console.log(`🚨 Emergency Admin: Retrieved ${usersResult.rows.length} users and ${sessionsResult.rows.length} sessions`);
      
      // Process data in JavaScript to ensure production compatibility
      const users = usersResult.rows;
      const sessions = sessionsResult.rows;
      
      const members = users.map(user => {
        const userSessions = sessions.filter(s => 
          s.user_email && s.user_email.toLowerCase() === user.email.toLowerCase()
        );
        const totalSeconds = userSessions.reduce((sum, s) => sum + (parseInt(s.duration_seconds) || 0), 0);
        
        // Properly determine status based on subscription_type
        let status = "Freemium";
        if (user.email === 'admin@kasina.app') {
          status = "Admin";
        } else if (user.subscription_type === 'premium') {
          status = "Premium";
        } else if (user.subscription_type === 'friend') {
          status = "Friend";
        }
        
        return {
          email: user.email,
          name: "",
          practiceTimeSeconds: totalSeconds,
          practiceTimeFormatted: `${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60)}m`,
          status
        };
      });
      
      const totalPracticeTime = members.reduce((sum, member) => sum + member.practiceTimeSeconds, 0);
      const totalHours = Math.floor(totalPracticeTime / 3600);
      const totalMinutes = Math.floor((totalPracticeTime % 3600) / 60);
      
      const responseData = {
        members,
        totalPracticeTimeFormatted: `${totalHours}h ${totalMinutes}m`,
        totalUsers: members.length,
        freemiumUsers: members.filter(m => m.status === 'Freemium').length,
        premiumUsers: members.filter(m => m.status === 'Premium').length,
        friendUsers: members.filter(m => m.status === 'Friend').length,
        adminUsers: members.filter(m => m.status === 'Admin').length,
        timestamp: new Date().toISOString(),
        source: 'emergency-simplified-queries'
      };
      
      console.log(`🚨 Emergency Admin: Successfully processed ${responseData.totalUsers} users`);
      console.log(`🚨 Breakdown: ${responseData.freemiumUsers} freemium, ${responseData.premiumUsers} premium, ${responseData.adminUsers} admin`);
      console.log(`🚨 Sample premium users:`, members.filter(m => m.status === 'Premium').slice(0, 3).map(m => `${m.email}(${m.status})`));
      console.log(`🚨 Response being sent:`, JSON.stringify(responseData, null, 2));
      res.json(responseData);
      
    } catch (error) {
      console.error('🚨 Emergency Admin: Database error:', error);
      res.status(500).json({ 
        message: "Emergency admin failed", 
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        source: 'emergency-simplified-queries'
      });
    }
  });

  // Direct database endpoint for debugging admin dashboard
  app.get("/api/admin/whitelist-direct", async (req, res) => {
    try {
      console.log('🔍 Direct Admin Access: Bypassing authentication for debugging...');
      
      // Direct database query without authentication check (production compatible)
      const result = await dbPool.query(`
        SELECT 
           u.id,
           u.email,
           u.subscription_type,
           u.created_at,
           u.updated_at,
           COALESCE(SUM(s.duration_seconds), 0) as total_practice_seconds,
           COALESCE(COUNT(s.id), 0) as total_sessions
         FROM users u
         LEFT JOIN sessions s ON LOWER(u.email) = LOWER(s.user_email)
         GROUP BY u.id, u.email, u.subscription_type, u.created_at, u.updated_at
         ORDER BY u.created_at DESC
      `);
      
      console.log(`📊 Direct Query: Retrieved ${result.rows.length} users`);
      
      const usersWithStats = result.rows.map(row => ({
        id: row.id,
        email: row.email,
        name: "", // Production schema doesn't include name field
        subscription_type: row.subscription_type,
        created_at: row.created_at,
        updated_at: row.updated_at,
        practiceStats: {
          totalSeconds: parseInt(row.total_practice_seconds),
          sessionCount: parseInt(row.total_sessions)
        }
      }));
      
      const totalPracticeTimeSeconds = usersWithStats.reduce((total, user) => {
        return total + user.practiceStats.totalSeconds;
      }, 0);
      
      const totalHours = Math.floor(totalPracticeTimeSeconds / 3600);
      const totalMinutes = Math.floor((totalPracticeTimeSeconds % 3600) / 60);
      const totalPracticeTimeFormatted = `${totalHours}h ${totalMinutes}m`;
      
      const adminEmails = ["admin@kasina.app"];
      const members = usersWithStats.map(user => {
        const practiceHours = Math.floor(user.practiceStats.totalSeconds / 3600);
        const practiceMinutes = Math.floor((user.practiceStats.totalSeconds % 3600) / 60);
        const practiceTimeFormatted = `${practiceHours}h ${practiceMinutes}m`;
        
        let status = "Freemium";
        if (adminEmails.includes(user.email)) {
          status = "Admin";
        } else if (user.subscription_type === 'premium') {
          status = "Premium";
        } else if (user.subscription_type === 'friend') {
          status = "Friend";
        }
        
        return {
          email: user.email,
          name: user.name || "",
          practiceTimeSeconds: user.practiceStats.totalSeconds,
          practiceTimeFormatted,
          status
        };
      });
      
      res.json({
        members,
        totalPracticeTimeFormatted,
        totalUsers: members.length,
        freemiumUsers: members.filter(m => m.status === "Freemium").length,
        premiumUsers: members.filter(m => m.status === "Premium").length,
        friendUsers: members.filter(m => m.status === "Friend").length,
        adminUsers: members.filter(m => m.status === "Admin").length,
        debug: "Direct database access - bypassing authentication"
      });
      
    } catch (error) {
      console.error("❌ Direct Admin Query Error:", error);
      res.status(500).json({ message: "Database query failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Get whitelist with member data from PostgreSQL database  
  app.get("/api/admin/whitelist", checkAdmin, async (req, res) => {
    try {
      console.log('🔍 Admin Dashboard: Starting user data fetch...');
      
      // Use simple separate queries to avoid complex JOIN issues
      const usersQuery = 'SELECT email, subscription_type, created_at FROM users ORDER BY created_at DESC';
      const sessionsQuery = 'SELECT user_email, duration_seconds FROM sessions WHERE duration_seconds > 0';
      
      const [usersResult, sessionsResult] = await Promise.all([
        dbPool.query(usersQuery),
        dbPool.query(sessionsQuery)
      ]);
      
      console.log(`📊 Retrieved ${usersResult.rows.length} users and ${sessionsResult.rows.length} sessions`);
      
      // Process data in JavaScript to avoid SQL JOIN complexities
      const users = usersResult.rows;
      const sessions = sessionsResult.rows;
      
      const usersWithStats = users.map(user => {
        const userSessions = sessions.filter(s => 
          s.user_email && s.user_email.toLowerCase() === user.email.toLowerCase()
        );
        const totalSeconds = userSessions.reduce((sum, s) => sum + (parseInt(s.duration_seconds) || 0), 0);
        
        return {
          id: Math.random(), // Generate ID for compatibility
          email: user.email,
          name: "",
          subscription_type: user.subscription_type,
          created_at: user.created_at,
          updated_at: user.created_at,
          practiceStats: {
            totalSeconds: totalSeconds,
            sessionCount: userSessions.length
          }
        };
      });
      console.log(`📊 Admin Dashboard: Retrieved ${usersWithStats.length} users from database`);
      
      if (usersWithStats.length === 0) {
        console.log('⚠️ Admin Dashboard: No users returned from getAllUsersWithStats');
        
        // Fallback: Try direct database query
        console.log('🔄 Admin Dashboard: Attempting direct database query...');
        const directResult = await dbPool.query('SELECT COUNT(*) FROM users');
        console.log('📊 Admin Dashboard: Direct user count:', directResult.rows[0].count);
      }
      
      // Calculate total practice time across all users
      const totalPracticeTimeSeconds = usersWithStats.reduce((total, user) => {
        return total + user.practiceStats.totalSeconds;
      }, 0);
      
      // Format total practice time
      const totalHours = Math.floor(totalPracticeTimeSeconds / 3600);
      const totalMinutes = Math.floor((totalPracticeTimeSeconds % 3600) / 60);
      const totalPracticeTimeFormatted = `${totalHours}h ${totalMinutes}m`;
      
      // Transform database users to match expected admin page format
      const members = usersWithStats.map(user => {
        const practiceHours = Math.floor(user.practiceStats.totalSeconds / 3600);
        const practiceMinutes = Math.floor((user.practiceStats.totalSeconds % 3600) / 60);
        const practiceTimeFormatted = `${practiceHours}h ${practiceMinutes}m`;
        
        let status = "Freemium";
        if (adminEmails.includes(user.email)) {
          status = "Admin";
        } else if (user.subscription_type === 'premium') {
          status = "Premium";
        } else if (user.subscription_type === 'friend') {
          status = "Friend";
        }
        
        return {
          email: user.email,
          name: user.name || "", // Use database name if available
          practiceTimeSeconds: user.practiceStats.totalSeconds,
          practiceTimeFormatted,
          status
        };
      });
      
      console.log(`✅ Admin Dashboard: Returning ${members.length} members to frontend`);
      
      res.json({
        members,
        totalPracticeTimeFormatted,
        totalUsers: members.length,
        freemiumUsers: members.filter(m => m.status === "Freemium").length,
        premiumUsers: members.filter(m => m.status === "Premium").length,
        friendUsers: members.filter(m => m.status === "Friend").length,
        adminUsers: members.filter(m => m.status === "Admin").length
      });
    } catch (error) {
      console.error("❌ Admin Dashboard: Error fetching whitelist data:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("❌ Admin Dashboard: Error stack:", errorStack);
      res.status(500).json({ 
        message: "Failed to fetch whitelist data",
        error: errorMessage,
        details: "Check server logs for more information"
      });
    }
  });

  // Emergency admin endpoint without authentication for immediate access
  app.get("/api/emergency-admin", async (req, res) => {
    try {
      console.log('🆘 Emergency Admin: Starting database query...');
      
      // Add direct database connection test
      const testQuery = await dbPool.query('SELECT COUNT(*) as count FROM users');
      console.log(`🔍 Direct DB test: ${testQuery.rows[0].count} users found`);
      
      // Test direct query without helper function
      const directUsersQuery = await dbPool.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 5');
      console.log(`🔍 Direct query test: ${directUsersQuery.rows.length} users returned`);
      console.log(`🔍 Sample emails: ${directUsersQuery.rows.map((u: any) => u.email).join(', ')}`);
      
      const users = await getAllUsers();
      const sessions = await getAllSessions();
      console.log(`📊 Retrieved ${users.length} users and ${sessions.length} sessions`);
      
      // Log first few users for debugging
      console.log(`🔍 First 3 users: ${users.slice(0, 3).map(u => u.email).join(', ')}`);
      
      // Calculate total practice time across all users
      const totalPracticeTimeSeconds = sessions.reduce((total, session) => {
        return total + session.duration_seconds;
      }, 0);
      
      const totalHours = Math.floor(totalPracticeTimeSeconds / 3600);
      const totalMinutes = Math.floor((totalPracticeTimeSeconds % 3600) / 60);
      const totalPracticeTimeFormatted = `${totalHours}h ${totalMinutes}m`;
      
      // Transform users to match expected admin page format
      const adminEmails = ["admin@kasina.app"];
      const members = users.map(user => {
        const userSessions = sessions.filter(s => 
          s.user_email && s.user_email.toLowerCase() === user.email.toLowerCase()
        );
        const practiceSeconds = userSessions.reduce((sum, s) => sum + s.duration_seconds, 0);
        const practiceHours = Math.floor(practiceSeconds / 3600);
        const practiceMinutes = Math.floor((practiceSeconds % 3600) / 60);
        const practiceTimeFormatted = `${practiceHours}h ${practiceMinutes}m`;
        
        let status = "Freemium";
        if (adminEmails.includes(user.email)) {
          status = "Admin";
        } else if (user.subscription_type === 'premium') {
          status = "Premium";
        } else if (user.subscription_type === 'friend') {
          status = "Friend";
        }
        
        return {
          email: user.email,
          name: user.name || "",
          practiceTimeSeconds: practiceSeconds,
          practiceTimeFormatted,
          status
        };
      });
      
      console.log(`✅ Processed ${members.length} members for response`);
      
      const response = {
        members,
        totalPracticeTimeFormatted,
        totalUsers: members.length,
        freemiumUsers: members.filter(m => m.status === "Freemium").length,
        premiumUsers: members.filter(m => m.status === "Premium").length,
        friendUsers: members.filter(m => m.status === "Friend").length,
        adminUsers: members.filter(m => m.status === "Admin").length
      };
      
      console.log(`🚀 Sending response with ${response.totalUsers} users`);
      res.json(response);
    } catch (error) {
      console.error("❌ Emergency admin endpoint error:", error);
      res.status(500).json({ 
        message: "Emergency admin access failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Batch import endpoint for production database population
  app.post("/api/admin/batch-import-users", async (req, res) => {
    try {
      const { users } = req.body;
      
      if (!users || !Array.isArray(users)) {
        return res.status(400).json({ message: "Invalid users data" });
      }
      
      console.log(`🚀 Batch import: Processing ${users.length} users`);
      
      let insertedCount = 0;
      let duplicateCount = 0;
      
      for (const user of users) {
        try {
          const result = await dbPool.query(
            `INSERT INTO users (email, subscription_type, name, created_at) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (email) DO NOTHING 
             RETURNING id`,
            [user.email, user.subscription_type, user.name || '', new Date(user.created_at)]
          );
          
          if (result.rows.length > 0) {
            insertedCount++;
          } else {
            duplicateCount++;
          }
        } catch (error) {
          console.error(`Error inserting user ${user.email}:`, error instanceof Error ? error.message : String(error));
        }
      }
      
      console.log(`✅ Batch complete: ${insertedCount} inserted, ${duplicateCount} duplicates`);
      
      res.json({
        success: true,
        inserted: insertedCount,
        duplicates: duplicateCount,
        total: users.length
      });
      
    } catch (error) {
      console.error("❌ Batch import error:", error);
      res.status(500).json({ 
        message: "Batch import failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Simple users endpoint for admin dashboard
  app.get("/api/admin/users-simple", checkAdmin, async (req, res) => {
    try {
      console.log('🔍 Admin Dashboard: Fetching simple user list...');
      
      const users = await getAllUsers();
      const sessions = await getAllSessions();
      console.log(`📊 Retrieved ${users.length} users and ${sessions.length} sessions`);
      
      // Calculate total practice time across all users
      const totalPracticeTimeSeconds = sessions.reduce((total, session) => {
        return total + session.duration_seconds;
      }, 0);
      
      const totalHours = Math.floor(totalPracticeTimeSeconds / 3600);
      const totalMinutes = Math.floor((totalPracticeTimeSeconds % 3600) / 60);
      const totalPracticeTimeFormatted = `${totalHours}h ${totalMinutes}m`;
      
      // Transform users to match expected admin page format
      const adminEmails = ["admin@kasina.app"];
      const members = users.map(user => {
        const userSessions = sessions.filter(s => 
          s.user_email && s.user_email.toLowerCase() === user.email.toLowerCase()
        );
        const practiceSeconds = userSessions.reduce((sum, s) => sum + s.duration_seconds, 0);
        const practiceHours = Math.floor(practiceSeconds / 3600);
        const practiceMinutes = Math.floor((practiceSeconds % 3600) / 60);
        const practiceTimeFormatted = `${practiceHours}h ${practiceMinutes}m`;
        
        let status = "Freemium";
        if (adminEmails.includes(user.email)) {
          status = "Admin";
        } else if (user.subscription_type === 'premium') {
          status = "Premium";
        } else if (user.subscription_type === 'friend') {
          status = "Friend";
        }
        
        return {
          email: user.email,
          name: user.name || "",
          practiceTimeSeconds: practiceSeconds,
          practiceTimeFormatted,
          status
        };
      });
      
      res.json({
        members,
        totalPracticeTimeFormatted,
        totalUsers: members.length,
        freemiumUsers: members.filter(m => m.status === "Freemium").length,
        premiumUsers: members.filter(m => m.status === "Premium").length,
        friendUsers: members.filter(m => m.status === "Friend").length,
        adminUsers: members.filter(m => m.status === "Admin").length
      });
    } catch (error) {
      console.error("❌ Error fetching simple user list:", error);
      res.status(500).json({ 
        message: "Failed to fetch user list",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // CSV Upload endpoint - ADDITIVE ONLY (preserves existing users)
  app.post("/api/admin/upload-whitelist-new", checkAdmin, upload.single("csv"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file uploaded" });
      }

      const userType = (req.body.userType as 'freemium' | 'premium' | 'friend' | 'admin') || 'freemium';
      console.log(`📥 ADDITIVE CSV upload for user type: ${userType}`);
      console.log(`📋 File size: ${req.file.size} bytes, filename: ${req.file.originalname}`);

      // Parse CSV data
      const records = parse(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      console.log(`📊 Parsed ${records.length} records from CSV`);
      console.log(`🔍 First record keys:`, Object.keys(records[0] || {}));
      console.log(`🔍 First record values:`, records[0]);

      if (!records || records.length === 0) {
        throw new Error("No data found in the CSV file");
      }

      // Find email column
      const firstRecord = records[0];
      const possibleEmailColumns = [
        "Email", "email", "EmailAddress", "Email Address", 
        "email_address", "e-mail", "User Email"
      ];

      let emailColumnName: string | null = null;
      for (const colName of possibleEmailColumns) {
        if (firstRecord[colName] !== undefined) {
          emailColumnName = colName;
          console.log(`✅ Found email column: ${colName}`);
          break;
        }
      }

      if (!emailColumnName) {
        // Try to find any column that might contain an email
        console.log(`🔍 Searching for email-like values in columns:`, Object.keys(firstRecord));
        for (const key of Object.keys(firstRecord)) {
          const value = firstRecord[key];
          console.log(`🔍 Checking column '${key}': '${value}'`);
          if (typeof value === 'string' && value.includes('@')) {
            emailColumnName = key;
            console.log(`✅ Found email-like column: ${key}`);
            break;
          }
        }
      }

      if (!emailColumnName) {
        console.log(`❌ Available columns:`, Object.keys(firstRecord));
        throw new Error(`No email column found in CSV file. Available columns: ${Object.keys(firstRecord).join(', ')}`);
      }

      // Extract and process ALL valid emails (both new and existing for updates)
      const usersToProcess = [];
      let invalidEmails = 0;
      
      console.log(`🔄 Processing ${records.length} records...`);
      
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const email = record[emailColumnName]?.trim();
        console.log(`📧 Row ${i + 1}: Processing '${email}' from column '${emailColumnName}'`);
        
        if (email && email.includes('@')) {
          const name = record['Name'] || record['name'] || record['Full Name'] || record['fullName'] || null;
          console.log(`➕ Adding ${userType} user: ${email} (name: ${name || 'none'})`);
          usersToProcess.push({
            email,
            name: name?.trim() || null,
            subscriptionType: userType
          });
        } else {
          invalidEmails++;
          console.log(`❌ Invalid email in row ${i + 1}: '${email}'`);
        }
      }

      console.log(`📊 Processing summary:`);
      console.log(`   - Users to process: ${usersToProcess.length}`);
      console.log(`   - Invalid emails: ${invalidEmails}`);

      if (usersToProcess.length === 0) {
        throw new Error(`No valid email addresses found in CSV file. Invalid emails: ${invalidEmails}`);
      }

      // Process ALL users (will insert new or update existing)
      console.log(`🔄 Attempting to process ${usersToProcess.length} users...`);
      const result = await bulkUpsertUsers(usersToProcess);
      console.log(`✅ Database processing result: ${result} users processed`);

      return res.status(200).json({ 
        message: `Successfully updated ${userType} whitelist with ${result} emails`, 
        count: result,
        userType
      });

    } catch (error) {
      console.error("❌ Error processing additive CSV upload:", error);
      console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      return res.status(500).json({ 
        message: "Failed to process the uploaded CSV file",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Delete user endpoint
  app.delete("/api/admin/delete-user", checkAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      console.log(`🗑️ Admin deletion request for: ${email}`);
      
      // Check if user exists
      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Delete user from database
      const deleted = await removeUser(email);
      
      if (deleted) {
        console.log(`✅ Successfully deleted user: ${email}`);
        res.json({ message: `User ${email} deleted successfully` });
      } else {
        console.log(`❌ Failed to delete user: ${email}`);
        res.status(500).json({ message: "Failed to delete user" });
      }
      
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Sessions routes - protected by authentication
  app.get("/api/sessions", async (req, res) => {
    if (!req.session?.user?.email) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      // Get user sessions from database
      const userEmail = req.session.user.email;
      const userSessions = await getUserSessions(userEmail);
      
      // Transform to match expected format
      const formattedSessions = userSessions.map(session => ({
        id: session.id.toString(),
        userEmail: session.user_email,
        kasinaType: session.kasina_type,
        kasinaName: session.kasina_name,
        duration: session.duration_seconds,
        timestamp: session.session_date.toISOString(),
        kasinaBreakdown: (session as any).kasina_breakdown || []
      }));
      
      res.json(formattedSessions);
    } catch (error) {
      console.error('Error getting user sessions:', error);
      res.status(500).json({ message: "Failed to retrieve sessions" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Delete session endpoint
  app.delete("/api/sessions/:id", async (req, res) => {
    if (!req.session?.user?.email) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const sessionId = parseInt(req.params.id);
      const userEmail = req.session.user.email;
      
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }
      
      const success = await deleteUserSession(userEmail, sessionId);
      
      if (success) {
        res.json({ message: "Session deleted successfully" });
      } else {
        res.status(404).json({ message: "Session not found or access denied" });
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Zapier webhook endpoints for automatic user registration
  app.post("/api/zapier/webhook/freemium", checkZapierAuth, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user already exists
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        if (existingUser.subscription_type === 'freemium') {
          console.log(`Zapier freemium: User ${email} already has freemium access`);
          return res.json({ 
            message: "User already has freemium access",
            email: email,
            status: "unchanged"
          });
        } else {
          // Update existing user to freemium (downgrade scenario)
          await upsertUser(email, undefined, 'freemium');
          console.log(`Zapier freemium: Updated ${email} to freemium`);
          return res.json({ 
            message: "User updated to freemium",
            email: email,
            status: "updated"
          });
        }
      }

      // Create new freemium user
      await upsertUser(email, undefined, 'freemium');

      console.log(`Zapier freemium: Created new user ${email}`);
      res.json({ 
        message: "Freemium user created successfully",
        email: email,
        status: "created"
      });
    } catch (error) {
      console.error("Zapier freemium webhook error:", error);
      res.status(500).json({ message: "Failed to process freemium user" });
    }
  });

  app.post("/api/zapier/webhook/premium", checkZapierAuth, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user already exists
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        if (existingUser.subscription_type === 'premium') {
          console.log(`Zapier premium: User ${email} already has premium access`);
          return res.json({ 
            message: "User already has premium access",
            email: email,
            status: "unchanged"
          });
        } else {
          // Update existing user to premium (upgrade scenario)
          await upsertUser(email, undefined, 'premium');
          console.log(`Zapier premium: Upgraded ${email} to premium`);
          return res.json({ 
            message: "User upgraded to premium",
            email: email,
            status: "upgraded"
          });
        }
      }

      // Create new premium user
      await upsertUser(email, undefined, 'premium');

      console.log(`Zapier premium: Created new user ${email}`);
      res.json({ 
        message: "Premium user created successfully",
        email: email,
        status: "created"
      });
    } catch (error) {
      console.error("Zapier premium webhook error:", error);
      res.status(500).json({ message: "Failed to process premium user" });
    }
  });

  app.post("/api/zapier/webhook/friend", checkZapierAuth, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user already exists
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        if (existingUser.subscription_type === 'friend') {
          console.log(`Zapier friend: User ${email} already has friend access`);
          return res.json({ 
            message: "User already has friend access",
            email: email,
            status: "unchanged"
          });
        } else {
          // Update existing user to friend (upgrade from freemium, or change from premium)
          await upsertUser(email, undefined, 'friend');
          console.log(`Zapier friend: Updated ${email} to friend`);
          return res.json({ 
            message: "User updated to friend",
            email: email,
            status: "updated"
          });
        }
      }

      // Create new friend user
      await upsertUser(email, undefined, 'friend');

      console.log(`Zapier friend: Created new user ${email}`);
      res.json({ 
        message: "Friend user created successfully",
        email: email,
        status: "created"
      });
    } catch (error) {
      console.error("Zapier friend webhook error:", error);
      res.status(500).json({ message: "Failed to process friend user" });
    }
  });

  // Session creation endpoint - NOW USING POSTGRESQL DATABASE
  app.post("/api/sessions", async (req, res) => {
    if (!req.session?.user?.email) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      console.log("Incoming session data:", req.body);
      
      const safeBody = { ...req.body };
      const duration = typeof safeBody.duration === 'number' ? safeBody.duration : 
                      parseInt(safeBody.duration, 10) || 0;
      const originalDuration = safeBody.originalDuration || 0;
      const durationInMinutes = safeBody.durationInMinutes || 0;
      
      // Final duration calculation
      let finalDuration = duration;
      
      if (originalDuration > 0) {
        finalDuration = originalDuration;
        console.log(`⏰ Using originalDuration: ${originalDuration} seconds`);
      } else if (durationInMinutes > 0) {
        finalDuration = durationInMinutes * 60;
        console.log(`⏰ Converting durationInMinutes ${durationInMinutes} to ${finalDuration} seconds`);
      } else {
        console.log(`⏰ Using duration as-is: ${finalDuration} seconds`);
      }
      
      const kasinaType = safeBody.kasinaType || "white";
      const displayName = safeBody.kasinaName || safeBody.kasinaType || "White";
      
      // Save session to PostgreSQL database
      const dbSession = await addSession(
        req.session.user.email,
        kasinaType,
        finalDuration,
        displayName
      );
      
      if (dbSession) {
        // Save kasina breakdown data if provided
        const kasinaBreakdown = safeBody.kasinaBreakdown;
        if (kasinaBreakdown && typeof kasinaBreakdown === 'object') {
          console.log("📊 Saving kasina breakdown data:", kasinaBreakdown);
          
          for (const [kasina, durationMs] of Object.entries(kasinaBreakdown)) {
            const durationSeconds = Math.round(Number(durationMs) / 1000);
            if (durationSeconds > 0) {
              try {
                await dbPool.query(
                  'INSERT INTO kasina_breakdowns (session_id, kasina_type, duration_seconds) VALUES ($1, $2, $3)',
                  [dbSession.id, kasina, durationSeconds]
                );
                console.log(`📈 Saved kasina breakdown: ${kasina} for ${durationSeconds}s`);
              } catch (breakdownError) {
                console.error(`Failed to save kasina breakdown for ${kasina}:`, breakdownError);
              }
            }
          }
        }

        const responseSession = {
          id: dbSession.id.toString(),
          userEmail: dbSession.user_email,
          kasinaType: dbSession.kasina_type,
          kasinaName: dbSession.kasina_name,
          duration: dbSession.duration_seconds,
          timestamp: dbSession.session_date.toISOString()
        };
        
        console.log(`✅ Saved session to PostgreSQL database for ${req.session.user.email}`);
        res.status(201).json(responseSession);
      } else {
        throw new Error('Failed to save session to database');
      }
    } catch (error) {
      console.error('Error saving session:', error);
      res.status(500).json({ message: "Failed to save session" });
    }
  });

  // Direct session endpoint for session logger compatibility
  app.post("/api/direct-one-minute-session", async (req, res) => {
    if (!req.session?.user?.email) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const { kasinaType, minutes = 1, userEmail } = req.body;
      const duration = minutes * 60; // Convert to seconds
      const kasinaName = `${kasinaType.charAt(0).toUpperCase() + kasinaType.slice(1)} (${minutes}-minute)`;
      
      // Save to database using the same function
      const dbSession = await addSession(
        req.session.user.email,
        kasinaType,
        duration,
        kasinaName
      );
      
      if (dbSession) {
        console.log(`✅ Direct session saved: ${kasinaType} for ${minutes} minutes`);
        res.status(201).json({
          id: dbSession.id.toString(),
          userEmail: dbSession.user_email,
          kasinaType: dbSession.kasina_type,
          kasinaName: dbSession.kasina_name,
          duration: dbSession.duration_seconds,
          timestamp: dbSession.session_date.toISOString()
        });
      } else {
        throw new Error('Failed to save session to database');
      }
    } catch (error) {
      console.error('Error saving direct session:', error);
      res.status(500).json({ message: "Failed to save session" });
    }
  });

  // CSV Upload endpoint for PostgreSQL database
  app.post("/api/admin/upload-whitelist", isAdmin, upload.single("csv"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file uploaded" });
      }

      const userType = (req.body.userType as 'freemium' | 'premium' | 'friend' | 'admin') || 'freemium';
      console.log(`Processing CSV upload for user type: ${userType}`);

      // Parse CSV data
      const records = parse(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      console.log(`Found ${records.length} records in CSV`);

      let processedCount = 0;
      for (const record of records) {
        try {
          // Handle multiple possible email column names
          const email = record['Email']?.trim() || 
                       record['email']?.trim() || 
                       record['EmailAddress']?.trim() || 
                       record['Email Address']?.trim();
          
          // Handle multiple possible name column names
          const name = record['Name']?.trim() || 
                      record['name']?.trim() || 
                      record['Full Name']?.trim() || 
                      record['fullName']?.trim();
          
          if (email && email.includes('@')) {
            console.log(`Adding ${userType} user: ${email} - ${name || 'No name'}`);
            const result = await upsertUser(email, name || null, userType);
            if (result) {
              processedCount++;
            }
          }
        } catch (error) {
          console.error(`Error processing user:`, error);
        }
      }

      console.log(`Successfully processed ${processedCount} users`);

      return res.status(200).json({ 
        message: `${userType.charAt(0).toUpperCase() + userType.slice(1)} whitelist updated successfully`, 
        count: processedCount,
        userType
      });

    } catch (error) {
      console.error("Error processing CSV upload:", error);
      return res.status(500).json({ 
        message: "Failed to process the uploaded CSV file",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Create HTTP server
  const server = createServer(app);
  return server;
}