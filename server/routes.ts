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
    
    // Include user email in the session (merging req.body first, then overriding email)
    const session = {
      id: Date.now().toString(),
      ...req.body,
      userEmail: req.session.user.email // Override any userEmail sent from client
    };
    
    sessions.push(session);
    
    // Save to file
    saveDataToFile(sessionsFilePath, sessions);
    console.log(`Saved session for ${req.session.user.email}, total sessions: ${sessions.length}`);
    
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

  const httpServer = createServer(app);

  return httpServer;
}
