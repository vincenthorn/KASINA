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
import { getUserByEmail, getAllUsers, upsertUser, bulkUpsertUsers, isUserWhitelisted, getUserSubscriptionType, removeUser, addSession, getUserSessions, getAllSessions, getUserPracticeStats, getAllUsersWithStats } from "./db";
import { handleCsvUpload, uploadMiddleware } from "./upload-fix.js";

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

  // Basic authentication routes
  app.post("/api/auth/login", async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    
    try {
      // Check if user exists in database
      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Store user in session
      req.session.user = { email: user.email };
      
      res.json({ 
        message: "Login successful",
        user: { 
          email: user.email,
          subscriptionType: user.subscription_type 
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.user?.email) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await getUserByEmail(req.session.user.email);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      res.json({ 
        email: user.email,
        subscriptionType: user.subscription_type 
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Authentication check failed" });
    }
  });

  // Admin routes - restricted to admin users
  const adminEmails = ["admin@kasina.app"];
  
  // Middleware to check if user is admin
  const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    const userEmail = req.session?.user?.email;
    
    if (userEmail && adminEmails.includes(userEmail)) {
      next();
    } else {
      res.status(403).json({ message: "Unauthorized: Admin access required" });
    }
  };

  // Get whitelist with member data from PostgreSQL database
  app.get("/api/admin/whitelist", isAdmin, async (req, res) => {
    try {
      // Get all users with their practice stats from PostgreSQL database
      const usersWithStats = await getAllUsersWithStats();
      
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
        }
        
        return {
          email: user.email,
          name: user.name || "", // Use database name if available
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
        adminUsers: members.filter(m => m.status === "Admin").length
      });
    } catch (error) {
      console.error("Error fetching whitelist data:", error);
      res.status(500).json({ message: "Failed to fetch whitelist data" });
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
        timestamp: session.session_date.toISOString()
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

      const userType = (req.body.userType as 'freemium' | 'premium' | 'admin') || 'freemium';
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