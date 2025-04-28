import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { parse } from "csv-parse/sync";

// Extend the Express Request type to include session
declare module "express-session" {
  interface SessionData {
    user?: {
      email: string;
    };
  }
}

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define path to whitelist CSV file
const whitelistPath = path.join(__dirname, "../whitelist.csv");

// Helper to read whitelist CSV
async function readWhitelist(): Promise<string[]> {
  try {
    // If whitelist doesn't exist, create empty file
    if (!fs.existsSync(whitelistPath)) {
      fs.writeFileSync(whitelistPath, "email\ntest@example.com\nuser@kasina.app\n", "utf-8");
    }
    
    const data = await fs.promises.readFile(whitelistPath, "utf-8");
    
    // Parse CSV (simple implementation for basic CSV)
    const emails = data
      .split("\n")
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#") && line !== "email"); // Skip header and comments
    
    return emails;
  } catch (error) {
    console.error("Error reading whitelist:", error);
    // Return a sample list for testing when file can't be read
    return ["test@example.com", "user@kasina.app"];
  }
}

// Session storage with file persistence
const sessionsFilePath = path.join(__dirname, "../server-sessions.json");
const communityVideosFilePath = path.join(__dirname, "../community-videos.json");

// Helper to load data from JSON file or return empty array if file doesn't exist
const loadDataFromFile = (filePath: string): any[] => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error);
  }
  return [];
};

// Helper to save data to JSON file
const saveDataToFile = (filePath: string, data: any[]): void => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error);
  }
};

// Load data from files or initialize with empty arrays
const sessions: any[] = loadDataFromFile(sessionsFilePath);
const communityVideos: any[] = loadDataFromFile(communityVideosFilePath);

// Log the loaded data
console.log(`Loaded ${sessions.length} sessions from file`);
console.log(`Loaded ${communityVideos.length} community videos from file`);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  },
});

// Helper function to write whitelist from CSV data
async function updateWhitelistFromCSV(csvData: Buffer): Promise<string[]> {
  try {
    // Parse CSV data
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    if (!records || records.length === 0) {
      throw new Error("No data found in the CSV file");
    }
    
    // Determine which column contains emails
    // Check common column names: Email, email, EmailAddress, Email Address, etc.
    const firstRecord = records[0];
    const possibleEmailColumns = [
      "Email", "email", "EmailAddress", "Email Address", 
      "email_address", "e-mail", "User Email"
    ];
    
    let emailColumnName: string | null = null;
    
    // Find the first column that exists in the record
    for (const colName of possibleEmailColumns) {
      if (firstRecord[colName] !== undefined) {
        emailColumnName = colName;
        break;
      }
    }
    
    // If no email column found, look for any column that might contain an email
    if (!emailColumnName) {
      for (const key of Object.keys(firstRecord)) {
        const value = firstRecord[key];
        if (typeof value === 'string' && value.includes('@')) {
          emailColumnName = key;
          break;
        }
      }
    }
    
    if (!emailColumnName) {
      throw new Error("Could not find email column in the CSV file");
    }
    
    console.log(`Using column "${emailColumnName}" for emails`);

    // Extract emails from the parsed data
    const emails = records
      .filter((record: any) => record[emailColumnName])
      .map((record: any) => String(record[emailColumnName]).trim().toLowerCase());

    // Check if there are any emails in the data
    if (emails.length === 0) {
      throw new Error("No valid email addresses found in the CSV file");
    }
    
    // Get existing whitelist to preserve user data
    let existingEmails: string[] = [];
    try {
      if (fs.existsSync(whitelistPath)) {
        existingEmails = await readWhitelist();
      }
    } catch (err) {
      console.warn("Could not read existing whitelist, creating new file");
    }
    
    // Combine existing and new emails, removing duplicates
    const combinedEmails = Array.from(new Set([...existingEmails, ...emails])) as string[];
    
    // Create a header row and add emails
    const csvContent = [
      "email",
      ...combinedEmails
    ].join("\n");

    // Write to the whitelist file
    await fs.promises.writeFile(whitelistPath, csvContent, "utf-8");

    return combinedEmails;
  } catch (error) {
    console.error("Error updating whitelist from CSV:", error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin routes - restricted to admin users
  const adminEmails = ["admin@kasina.app"];
  
  // Middleware to check if user is admin
  const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    // Get email from session if available
    const userEmail = req.session?.user?.email;
    
    // Allow if admin
    if (userEmail && adminEmails.includes(userEmail)) {
      next();
    } else {
      res.status(403).json({ message: "Unauthorized: Admin access required" });
    }
  };
  
  // CSV Upload endpoint
  app.post(
    "/api/admin/upload-whitelist", 
    isAdmin,
    upload.single("csv"), 
    async (req, res) => {
      try {
        // Check if file was provided
        if (!req.file) {
          return res.status(400).json({ message: "No CSV file uploaded" });
        }
        
        // Process the uploaded CSV
        const emails = await updateWhitelistFromCSV(req.file.buffer);
        
        return res.status(200).json({ 
          message: "Whitelist updated successfully", 
          count: emails.length 
        });
      } catch (error) {
        console.error("Error processing whitelist upload:", error);
        return res.status(500).json({ 
          message: "Failed to process the uploaded CSV file",
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }
  );
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Check whitelist
      const whitelist = await readWhitelist();
      const isWhitelisted = whitelist.includes(email.trim().toLowerCase());
      
      if (isWhitelisted) {
        // Store user in session
        if (req.session) {
          req.session.user = { email: email.trim().toLowerCase() };
          await new Promise<void>((resolve, reject) => {
            req.session.save((err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
        
        // Return successful response
        return res.status(200).json({ 
          message: "Login successful",
          user: { email } 
        });
      } else {
        return res.status(403).json({ 
          message: "Access denied. Your email is not on the whitelist." 
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Server error during login" });
    }
  });
  
  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Error during logout" });
      }
      
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  // Get current user session
  app.get("/api/auth/me", (req, res) => {
    if (req.session?.user) {
      res.status(200).json({ user: req.session.user });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
  
  // Sessions routes - protected by authentication
  app.get("/api/sessions", (req, res) => {
    if (!req.session?.user?.email) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Filter sessions by user email
    const userEmail = req.session.user.email;
    const userSessions = sessions.filter(session => session.userEmail === userEmail);
    
    res.json(userSessions);
  });
  
  app.post("/api/sessions", (req, res) => {
    if (!req.session?.user?.email) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Log the incoming data to help debug duration issues
    console.log("Incoming session data:", req.body);
    
    // CRITICAL FIX: Create a safe copy of the request body we can modify
    const safeBody = { ...req.body };
    
    // UNIVERSAL FIX FOR ALL TIMER DURATIONS
    // Extract all relevant duration data from the request
    const kasinaName = (safeBody.kasinaName || '').toLowerCase();
    const duration = typeof safeBody.duration === 'number' ? safeBody.duration : 
                    parseInt(safeBody.duration, 10) || 0;
    const originalDuration = safeBody.originalDuration || 0;
    const durationInMinutes = safeBody.durationInMinutes || 0;
    
    console.log("CRITICAL DURATION DEBUG:");
    console.log("1. Kasina Name:", kasinaName);
    console.log("2. Raw Duration:", safeBody.duration);
    console.log("3. Parsed Duration:", duration);
    console.log("4. Original Duration:", originalDuration);
    console.log("5. Duration in Minutes:", durationInMinutes);
    console.log("6. Minutes Rounded:", Math.round(duration/60));
    
    // KASINA TYPE NORMALIZATION - Universal handling for all kasina types
    // This ensures consistent casing and formatting for all kasina types
    
    // Get the kasina type and always convert to lowercase for consistency
    const rawKasinaType = safeBody.kasinaType || '';
    const normalizedType = rawKasinaType.toLowerCase();
    
    // Check if this came from our direct fix
    if (req.body._directFix) {
      console.log(`📦 DIRECT FIX DETECTED:`);
      console.log(`- Raw Kasina Type: "${rawKasinaType}"`);
      console.log(`- Normalized Type: "${normalizedType}"`);
      console.log(`- Duration: ${duration}s`);
      console.log(`- Manual Stop: ${req.body._manualStop ? 'Yes' : 'No'}`);
    }
    
    // Always override with the normalized type to ensure consistency
    safeBody.kasinaType = normalizedType;
    
    // Log for yellow kasina sessions for backward compatibility
    if (normalizedType === 'yellow' || kasinaName.includes('yellow')) {
      console.log("🟡 YELLOW KASINA SESSION PROCESSED WITH NORMALIZED TYPE");
    }
    
    // STEP 1: Start with the most reliable value
    let finalDuration = duration; // Default to parsed duration value
    
    // STEP 2: Check if this is a manually stopped session
    // If duration is significantly less than originalDuration, this was likely manually stopped
    if (originalDuration > 0 && duration > 0 && duration < originalDuration * 0.9) {
      console.log(`🔍 Detected manually stopped session - elapsed time: ${duration}s, original duration: ${originalDuration}s`);
      
      // For manually stopped sessions with less than 30 seconds, don't log at all
      if (duration < 30) {
        console.log(`⚠️ Session too short (${duration}s) - it will not be saved`);
        finalDuration = 0; // This will trigger the "duration too short" condition later
      } 
      // For sessions between 30-59 seconds, round up to 1 minute
      else if (duration < 60) {
        console.log(`⏱️ Rounding short session (${duration}s) up to 1 minute`);
        finalDuration = 60;
      }
      // For all other durations, follow the "round to nearest minute" rule
      else {
        // Get the seconds portion of the time
        const seconds = duration % 60;
        
        // If seconds are >= 31, round up to the next minute
        if (seconds >= 31) {
          const minutes = Math.floor(duration / 60) + 1;
          finalDuration = minutes * 60;
          console.log(`⏱️ Rounding up ${duration}s to ${minutes} minutes (${finalDuration}s)`);
        } 
        // Otherwise round down to the current minute
        else {
          const minutes = Math.floor(duration / 60);
          finalDuration = minutes * 60;
          console.log(`⏱️ Rounding down ${duration}s to ${minutes} minutes (${finalDuration}s)`);
        }
      }
    } else {
      // STEP 3: For completed sessions, use the intended duration from the name or settings
      const minuteMatch = kasinaName.match(/(\d+)[- ]minute/);
      if (minuteMatch && minuteMatch[1]) {
        const extractedMinutes = parseInt(minuteMatch[1], 10);
        if (!isNaN(extractedMinutes) && extractedMinutes > 0) {
          console.log(`💡 Found explicit minute value in name: ${extractedMinutes} minutes`);
          finalDuration = extractedMinutes * 60; // Convert to seconds
        }
      }
      
      // STEP 4: Use explicitly provided duration in minutes - HIGHEST PRIORITY AFTER NAME MATCH
      // This is a reliable source of truth since it's set directly from user input
      if (durationInMinutes > 0) { 
        console.log(`🔥 Using explicitly provided minutes: ${durationInMinutes} minutes`);
        // Override final duration to exactly match what the user entered
        finalDuration = durationInMinutes * 60; // Convert to seconds
        console.log(`💡 Correcting to exactly ${durationInMinutes} minutes (${finalDuration}s)`);
      }
      
      // STEP 5: Use original duration if it's valid and different
      else if (originalDuration > 0 && originalDuration !== duration) {
        console.log(`💡 Using original duration: ${originalDuration} seconds`);
        finalDuration = originalDuration;
      }
    }
    
    // STEP 5: For common time values, ensure they're exactly correct (1, 2, 3, 5, 10, 15, etc minutes)
    // Get the intended number of minutes
    const intendedMinutes = Math.round(finalDuration / 60);
    if (intendedMinutes > 0) {
      const exactSeconds = intendedMinutes * 60;
      // If the current duration is within 5% of a whole minute value, snap to the exact minute
      if (Math.abs(finalDuration - exactSeconds) < (exactSeconds * 0.05)) {
        console.log(`💡 Correcting ${finalDuration}s to exactly ${intendedMinutes} minutes (${exactSeconds}s)`);
        finalDuration = exactSeconds;
      }
    }
    
    // Validate finalDuration is sensible
    if (isNaN(finalDuration) || finalDuration <= 0) {
      console.warn("Session too short or invalid duration - not saving");
      // Return a 400 response to indicate that the session is too short
      return res.status(400).json({ 
        message: "Session too short to save - minimum recordable time is 31 seconds",
        error: "duration_too_short" 
      });
    }
    
    // Format the name to include the CORRECT duration in minutes with proper pluralization
    const minutes = Math.round(finalDuration / 60);
    
    // Determine the kasina type for the name
    const kasinaType = safeBody.kasinaType || '';
    
    // Add proper pluralization to "minute"
    const minuteText = minutes === 1 ? "minute" : "minutes";
    
    // Create a completely new name to be absolutely certain
    const correctKasinaName = `${kasinaType.charAt(0).toUpperCase() + kasinaType.slice(1)} (${minutes}-${minuteText})`;
    
    // Final record to save
    const session = {
      id: Date.now().toString(),
      kasinaType: safeBody.kasinaType,
      kasinaName: correctKasinaName, // Always use our corrected name
      duration: finalDuration, // Use our validated duration
      timestamp: safeBody.timestamp || new Date().toISOString(),
      userEmail: req.session.user.email // Override any userEmail sent from client
    };
    
    // Log the finalized session data
    console.log("🔍 Final session data to save:", {
      id: session.id,
      kasinaType: session.kasinaType,
      kasinaName: session.kasinaName,
      duration: session.duration,
      timestamp: session.timestamp,
      userEmail: session.userEmail
    });
    
    sessions.push(session);
    
    // Save to file
    saveDataToFile(sessionsFilePath, sessions);
    console.log(`✅ Saved session for ${req.session.user.email}, total sessions: ${sessions.length}`);
    
    res.status(201).json(session);
  });
  
  // Community videos routes
  app.get("/api/community-videos", (req, res) => {
    res.json(communityVideos);
  });
  
  app.post("/api/community-videos", (req, res) => {
    const video = {
      id: Date.now().toString(),
      submittedBy: req.body.email || "Anonymous",
      createdAt: new Date().toISOString(),
      ...req.body
    };
    
    communityVideos.push(video);
    res.status(201).json(video);
  });
  
  // Route to clean test data (temporary convenience route)
  app.get("/api/clean-test-data/:email", (req, res) => {
    try {
      const { email } = req.params;
      if (!email) {
        return res.status(400).json({ message: "Email parameter is required" });
      }
      
      const normalizedEmail = email.trim().toLowerCase();
      
      // Only allow specific test accounts to be cleaned
      const allowedTestAccounts = ["carlgregg@gmail.com", "test@example.com"];
      if (!allowedTestAccounts.includes(normalizedEmail)) {
        return res.status(403).json({ 
          message: "This operation is only allowed for designated test accounts" 
        });
      }
      
      // Find the number of sessions before deletion
      const beforeCount = sessions.length;
      
      // Filter out sessions for the specified user
      const updatedSessions = sessions.filter(session => session.userEmail !== normalizedEmail);
      
      // Calculate how many sessions were removed
      const removedCount = beforeCount - updatedSessions.length;
      
      // Update the sessions array
      sessions.splice(0, sessions.length, ...updatedSessions);
      
      // Save the updated sessions to file
      saveDataToFile(sessionsFilePath, sessions);
      
      console.log(`✅ Cleaned ${removedCount} test sessions for user ${normalizedEmail}`);
      
      return res.status(200).json({
        message: `Successfully removed ${removedCount} sessions for user ${normalizedEmail}`,
        removedCount
      });
    } catch (error) {
      console.error("Error cleaning test data:", error);
      return res.status(500).json({
        message: "Failed to clean test data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Delete all sessions for a specific user (admin only)
  app.delete("/api/admin/user-sessions/:email", isAdmin, (req, res) => {
    try {
      const { email } = req.params;
      if (!email) {
        return res.status(400).json({ message: "Email parameter is required" });
      }
      
      const normalizedEmail = email.trim().toLowerCase();
      
      // Find the number of sessions before deletion
      const beforeCount = sessions.length;
      
      // Filter out sessions for the specified user
      const updatedSessions = sessions.filter(session => session.userEmail !== normalizedEmail);
      
      // Calculate how many sessions were removed
      const removedCount = beforeCount - updatedSessions.length;
      
      // Update the sessions array
      sessions.splice(0, sessions.length, ...updatedSessions);
      
      // Save the updated sessions to file
      saveDataToFile(sessionsFilePath, sessions);
      
      console.log(`✅ Removed ${removedCount} sessions for user ${normalizedEmail}`);
      
      return res.status(200).json({
        message: `Successfully removed ${removedCount} sessions for user ${normalizedEmail}`,
        removedCount
      });
    } catch (error) {
      console.error("Error deleting user sessions:", error);
      return res.status(500).json({
        message: "Failed to delete user sessions",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
