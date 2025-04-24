import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

// In-memory sessions storage (to be replaced by database)
const sessions: any[] = [];
const communityVideos: any[] = [];

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Check whitelist
      const whitelist = await readWhitelist();
      const isWhitelisted = whitelist.includes(email);
      
      if (isWhitelisted) {
        // In a real app, we would create a session or JWT here
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
  
  // Sessions routes
  app.get("/api/sessions", (req, res) => {
    res.json(sessions);
  });
  
  app.post("/api/sessions", (req, res) => {
    const session = {
      id: Date.now().toString(),
      ...req.body
    };
    
    sessions.push(session);
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
