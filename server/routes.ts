import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { getUserByEmail, getAllUsers, upsertUser, bulkUpsertUsers, isUserWhitelisted, getUserSubscriptionType, removeUser, addSession, getUserSessions, getAllSessions, getUserPracticeStats, getAllUsersWithStats } from "./db";

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

// Define paths to whitelist CSV files for different user types
const freemiumWhitelistPath = path.join(__dirname, "../whitelist-freemium.csv");
const premiumWhitelistPath = path.join(__dirname, "../whitelist-premium.csv");
const adminWhitelistPath = path.join(__dirname, "../whitelist-admin.csv");
const whitelistPath = path.join(__dirname, "../whitelist.csv"); // Legacy whitelist file, still used for now

// Helper to ensure a whitelist file exists with protected emails
async function ensureWhitelistFile(filePath: string, protectedEmails: string[]): Promise<void> {
  // If whitelist doesn't exist, create empty file with protected emails
  if (!fs.existsSync(filePath)) {
    const initialContent = [
      "email",
      ...protectedEmails
    ].join("\n") + "\n";
    
    await fs.promises.writeFile(filePath, initialContent, "utf-8");
  }
}

// Helper to read whitelist from PostgreSQL database
async function readWhitelist(): Promise<string[]> {
  try {
    const users = await getAllUsers();
    return users.map(user => user.email);
  } catch (error) {
    console.error("Error reading whitelist from database:", error);
    // Return core protected emails as fallback
    return [
      "admin@kasina.app",
      "premium@kasina.app",
      "user@kasina.app",
      "brian@terma.asia", 
      "emilywhorn@gmail.com", 
      "ryan@ryanoelke.com",
      "ksowocki@gmail.com",
      "lisashermanavl@gmail.com"
    ];
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
    // Define protected emails that should never be removed from whitelist
    const protectedEmails = [
      "admin@kasina.app", 
      "user@kasina.app",
      "premium@kasina.app", // Test premium account
      // Premium users that should always remain
      "brian@terma.asia", 
      "emilywhorn@gmail.com", 
      "ryan@ryanoelke.com",
      "ksowocki@gmail.com"
    ];
    
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
    
    // Find name column if it exists
    const possibleNameColumns = [
      "Name", "name", "Full Name", "full name", "First Name", "first name",
      "FullName", "firstName", "FirstName", "Name"
    ];
    
    let nameColumnName: string | null = null;
    
    // Find the first name column that exists in the record
    for (const colName of possibleNameColumns) {
      if (firstRecord[colName] !== undefined) {
        nameColumnName = colName;
        break;
      }
    }
    
    // Build a name map to save separately
    const nameMap: Record<string, string> = {};
    
    // Extract emails from the parsed data
    const emails = records
      .filter((record: any) => record[emailColumnName])
      .map((record: any) => {
        const email = String(record[emailColumnName]).trim().toLowerCase();
        
        // Save name if available
        if (nameColumnName && record[nameColumnName]) {
          const name = String(record[nameColumnName]).trim();
          if (name) {
            nameMap[email] = name;
          }
        }
        
        return email;
      });

    // Check if there are any emails in the data
    if (emails.length === 0) {
      throw new Error("No valid email addresses found in the CSV file");
    }
    
    // Always ensure protected emails are included
    const emailsWithProtected = [...emails, ...protectedEmails];
    
    // Get existing whitelist to preserve user data
    let existingEmails: string[] = [];
    try {
      if (fs.existsSync(whitelistPath)) {
        existingEmails = await readWhitelist();
      }
    } catch (err) {
      console.warn("Could not read existing whitelist, creating new file");
    }
    
    // We don't merge all emails anymore - we use ONLY the uploaded ones plus protected emails
    // This is a change from the previous behavior that preserved all existing emails
    const combinedEmails = Array.from(new Set(emailsWithProtected)) as string[];
    
    console.log(`Whitelist update: ${emails.length} emails in CSV, ${combinedEmails.length} after adding protected accounts`);
    console.log(`Found ${Object.keys(nameMap).length} names in the CSV`);
    
    // Create a header row and add emails
    const csvContent = [
      "email",
      ...combinedEmails
    ].join("\n");

    // Write to the whitelist file
    await fs.promises.writeFile(whitelistPath, csvContent, "utf-8");
    
    // Save name map to a separate file
    if (Object.keys(nameMap).length > 0) {
      const nameMapPath = path.join(process.cwd(), 'name-map.json');
      await fs.promises.writeFile(nameMapPath, JSON.stringify(nameMap, null, 2));
      console.log(`Saved ${Object.keys(nameMap).length} names to name-map.json`);
    }

    return combinedEmails;
  } catch (error) {
    console.error("Error updating whitelist from CSV:", error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Public tool routes - these don't require authentication
  app.get("/tools/logo-export", (req, res) => {
    const logoExportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KASINA Logo Export Tool</title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Nunito', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background-color: #f0f0f0;
      margin: 0;
      padding: 20px;
    }
    
    .container {
      max-width: 650px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      padding: 2rem;
      margin: 0 auto;
    }
    
    h1 {
      text-align: center;
      margin-bottom: 1rem;
      color: #333;
    }
    
    p {
      text-align: center;
      color: #666;
      margin-bottom: 1.5rem;
    }
    
    canvas {
      background-image: 
        linear-gradient(45deg, #ccc 25%, transparent 25%), 
        linear-gradient(-45deg, #ccc 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #ccc 75%), 
        linear-gradient(-45deg, transparent 75%, #ccc 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
      border: 1px solid #ddd;
      max-width: 100%;
      display: block;
      margin: 0 auto 1.5rem auto;
    }
    
    .color-selector {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    
    .color-option {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
      position: relative;
      transition: transform 0.2s;
    }
    
    .color-option:hover {
      transform: scale(1.1);
    }
    
    .color-option.active {
      border-color: #333;
    }
    
    .color-option[data-color="yellow"] {
      background-color: #F9D923;
    }
    
    .color-option[data-color="black"] {
      background-color: #333;
    }
    
    .color-option[data-color="red"] {
      background-color: #FF4545;
    }
    
    .color-option[data-color="blue"] {
      background-color: #3B82F6;
    }
    
    .button-group {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    
    button {
      padding: 12px 24px;
      background-color: #F9D923;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    button:hover {
      opacity: 0.9;
      transform: translateY(-2px);
    }
    
    button.download-btn {
      padding: 14px 28px;
    }
    
    .info {
      margin-top: 20px;
      max-width: 500px;
      line-height: 1.5;
      font-size: 0.9rem;
      text-align: center;
      color: #666;
    }
    
    .color-name {
      display: block;
      text-align: center;
      margin-top: 0.5rem;
      font-weight: bold;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>KASINA Logo Export Tool</h1>
    <p>Generate a transparent PNG of the KASINA logo in different colors</p>
    
    <canvas id="canvas" width="512" height="512"></canvas>
    
    <div class="color-name" id="colorName">Yellow</div>
    
    <div class="color-selector">
      <div class="color-option active" data-color="yellow" title="Yellow"></div>
      <div class="color-option" data-color="black" title="Black"></div>
      <div class="color-option" data-color="red" title="Red"></div>
      <div class="color-option" data-color="blue" title="Blue"></div>
    </div>
    
    <div class="button-group">
      <button onclick="downloadLogo()" class="download-btn">Download PNG</button>
    </div>
    
    <div class="info">
      <p>This is a square ratio PNG (512×512px) of the KASINA logo with the orb above the text, all on a transparent background. Perfect for website favicons and promotional materials.</p>
    </div>
  </div>
  
  <script>
    // Color palette
    const COLORS = {
      yellow: '#F9D923',
      black: '#333333',
      red: '#FF4545',
      blue: '#3B82F6'
    };
    
    // Current selected color
    let currentColor = 'yellow';
    
    // Get the canvas context and color elements
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const colorOptions = document.querySelectorAll('.color-option');
    const colorNameElement = document.getElementById('colorName');
    
    // Set up color selection
    colorOptions.forEach(option => {
      option.addEventListener('click', () => {
        // Update active state
        colorOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        
        // Update current color
        currentColor = option.getAttribute('data-color');
        colorNameElement.textContent = currentColor.charAt(0).toUpperCase() + currentColor.slice(1);
        
        // Redraw logo with new color
        renderLogo();
      });
    });
    
    // Render the logo when the page loads
    window.onload = function() {
      renderLogo();
    };
    
    function renderLogo() {
      const size = canvas.width; // Square canvas
      const selectedColor = COLORS[currentColor];
      
      // Clear canvas to ensure transparency
      ctx.clearRect(0, 0, size, size);
      
      // Calculate dimensions
      const orbSize = size * 0.35; // 35% of canvas size
      const orbX = size / 2;
      const orbY = size * 0.35; // Position orb at 35% from top
      
      // Draw orb glow
      const gradient = ctx.createRadialGradient(orbX, orbY, orbSize * 0.4, orbX, orbY, orbSize);
      gradient.addColorStop(0, selectedColor);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.beginPath();
      ctx.arc(orbX, orbY, orbSize, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Draw solid orb
      ctx.beginPath();
      ctx.arc(orbX, orbY, orbSize * 0.8, 0, 2 * Math.PI);
      ctx.fillStyle = selectedColor;
      ctx.fill();
      
      // Make sure Nunito font is loaded before drawing text
      document.fonts.ready.then(() => {
        // Draw KASINA text
        const fontSize = size * 0.14; // 14% of canvas size
        ctx.font = \`bold \${fontSize}px 'Nunito', sans-serif\`;
        ctx.textAlign = 'center';
        ctx.fillStyle = selectedColor;
        ctx.textBaseline = 'middle';
        
        // Position text clearly below orb
        const textY = size * 0.75; // 75% from top (moved down from 70%)
        ctx.fillText('KASINA', size / 2, textY);
      });
    }
    
    function downloadLogo() {
      // Convert canvas to data URL
      const dataURL = canvas.toDataURL('image/png');
      
      // Create download link with the current color in the filename
      const link = document.createElement('a');
      link.download = \`kasina-logo-\${currentColor}.png\`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  </script>
</body>
</html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(logoExportHtml);
  });
  
  // Server-side deduplication cache for session saves (10-second window)
  // This prevents duplicate sessions from being saved when multiple requests arrive in quick succession
  const sessionDedupeCache = new Map<string, number>();
  
  // Function to check if a session save request is a duplicate
  const isDuplicateSession = (userEmail: string, kasinaType: string, duration: number): boolean => {
    // Create a unique key for this session save request
    const minutes = Math.ceil(duration / 60);
    const cacheKey = `${userEmail}:${kasinaType}:${minutes}`;
    
    // Also create a more general key just for this user and kasina type
    // This helps prevent very closely timed duplicates (within 3 seconds)
    const shortCacheKey = `${userEmail}:${kasinaType}`;
    
    const now = Date.now();
    
    // Check if we've processed this exact session recently (within 10 seconds)
    const lastSaveTime = sessionDedupeCache.get(cacheKey);
    if (lastSaveTime && (now - lastSaveTime < 10000)) {
      console.log(`🛑 SERVER DEDUPE: Prevented duplicate session save for ${cacheKey} (${Math.round((now - lastSaveTime)/1000)}s ago)`);
      return true;
    }
    
    // Also check if we've just processed ANY session of this type for this user (within 3 seconds)
    // This helps catch multiple closely timed submissions through different routes
    const lastTypeTime = sessionDedupeCache.get(shortCacheKey);
    if (lastTypeTime && (now - lastTypeTime < 3000)) {
      console.log(`🛑 STRICT DEDUPE: Prevented closely timed session of same type (${Math.round((now - lastTypeTime)/1000)}s ago)`);
      return true;
    }
    
    // If not a duplicate, add to both caches
    sessionDedupeCache.set(cacheKey, now);
    sessionDedupeCache.set(shortCacheKey, now);
    
    // Clean up old cache entries
    for (const [key, timestamp] of sessionDedupeCache.entries()) {
      if (now - timestamp > 60000) { // Older than 1 minute
        sessionDedupeCache.delete(key);
      }
    }
    
    return false;
  };
  
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
  
  // Get whitelist with member data
  app.get(
    "/api/admin/whitelist",
    isAdmin,
    async (req, res) => {
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
          const hours = Math.floor(user.practiceStats.totalSeconds / 3600);
          const minutes = Math.floor((user.practiceStats.totalSeconds % 3600) / 60);
          
          return {
            email: user.email,
            name: user.name || "",
            status: user.subscription_type === 'admin' ? 'Admin' : 
                   user.subscription_type === 'premium' ? 'Premium' : 'Freemium',
            practiceTimeSeconds: user.practiceStats.totalSeconds,
            practiceTimeFormatted: `${hours}h ${minutes}m`
          };
        });
        
        console.log(`Retrieved ${members.length} users from PostgreSQL database`);
        
        return res.status(200).json({ 
          members,
          total: members.length,
          totalPracticeTimeSeconds,
          totalPracticeTimeFormatted
        });
      } catch (error) {
        console.error("Error retrieving user data from database:", error);
        return res.status(500).json({ 
          message: "Failed to retrieve user data",
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }
  );
        
        // Parse CSV to extract names and emails
        const csvData = legacyData; // Use legacy whitelist data
        const lines = csvData.split("\n").filter(line => line.trim());
        const headers = lines[0].split(",");
        
        // Find the email and name column indexes
        const emailColIndex = headers.findIndex(h => 
          h.toLowerCase().includes("email"));
        const nameColIndex = headers.findIndex(h => 
          h.toLowerCase() === "name" || h.toLowerCase().includes("full") || h.toLowerCase().includes("first"));
        
        console.log("Using column headers:", headers);
        if (nameColIndex >= 0) {
          console.log(`Found name column: "${headers[nameColIndex]}" at index ${nameColIndex}`);
        } else {
          console.log("No name column found in the CSV");
        }
        
        // Map of email to name from CSV
        let nameMap: Record<string, string> = {};
        
        // First try to read the separate name-map.json file
        const nameMapPath = path.join(process.cwd(), 'name-map.json');
        if (fs.existsSync(nameMapPath)) {
          try {
            const nameMapContent = await fs.promises.readFile(nameMapPath, 'utf-8');
            nameMap = JSON.parse(nameMapContent);
            console.log(`Loaded ${Object.keys(nameMap).length} names from name-map.json`);
          } catch (err) {
            console.error("Error reading name-map.json:", err);
          }
        }
        
        // If no separate name map or it's empty, try parsing CSV data
        if (Object.keys(nameMap).length === 0 && emailColIndex >= 0) {
          console.log("No name map file found or it was empty, trying to parse CSV for names");
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",");
            if (values.length > emailColIndex) {
              const email = values[emailColIndex].trim().toLowerCase();
              // Add name if found, otherwise leave blank
              const name = nameColIndex >= 0 && values.length > nameColIndex 
                ? values[nameColIndex].trim() 
                : "";
              if (name) {
                nameMap[email] = name;
              }
            }
          }
          console.log(`Parsed ${Object.keys(nameMap).length} names from CSV`);
        }
        
        // Get sessions data from the storage file
        let allSessions = [];
        try {
          // Try to load sessions directly from file if needed
          if (!Array.isArray(sessions) || sessions.length === 0) {
            // Try server-sessions.json first (actual file name used in the app)
            const serverSessionsPath = path.join(process.cwd(), 'server-sessions.json');
            const legacySessionsPath = path.join(process.cwd(), 'sessions.json');
            
            if (fs.existsSync(serverSessionsPath)) {
              const sessionsData = await fs.promises.readFile(serverSessionsPath, 'utf-8');
              allSessions = JSON.parse(sessionsData);
              console.log(`Loaded ${allSessions.length} sessions from server-sessions.json`);
            } 
            // Fallback to the legacy path as a backup
            else if (fs.existsSync(legacySessionsPath)) {
              const sessionsData = await fs.promises.readFile(legacySessionsPath, 'utf-8');
              allSessions = JSON.parse(sessionsData);
              console.log(`Loaded ${allSessions.length} sessions from legacy sessions.json`);
            }
          } else {
            allSessions = sessions;
          }
        } catch (err) {
          console.error("Error loading sessions from file:", err);
          allSessions = [];
        }
        
        // Calculate total practice time per user
        const userPracticeTimes: Record<string, number> = {};
        
        for (const session of allSessions) {
          if (session.userEmail) {
            const email = session.userEmail.toLowerCase();
            // Add duration in seconds to user's total
            userPracticeTimes[email] = (userPracticeTimes[email] || 0) + (session.duration || 0);
          }
        }
        
        // Calculate total network time (all users combined)
        let totalPracticeTimeSeconds = 0;
        Object.values(userPracticeTimes).forEach(time => {
          totalPracticeTimeSeconds += time;
        });
        
        // Format the total time into hours and minutes
        const totalHours = Math.floor(totalPracticeTimeSeconds / 3600);
        const totalMinutes = Math.floor((totalPracticeTimeSeconds % 3600) / 60);
        const totalPracticeTimeFormatted = `${totalHours}h ${totalMinutes}m`;
        
        // Add debug logs
        console.log("Freemium emails:", freemiumEmails);
        
        // Build the member list with all data
        const members = whitelistEmails.map(email => {
          const practiceDuration = userPracticeTimes[email.toLowerCase()] || 0;
          const hours = Math.floor(practiceDuration / 3600);
          const minutes = Math.floor((practiceDuration % 3600) / 60);
          const lowercaseEmail = email.toLowerCase();
          
          // Determine user status based on which list they're in
          let status = "Freemium";
          if (adminEmails.includes(lowercaseEmail)) {
            status = "Admin";
          } else if (premiumEmails.includes(lowercaseEmail)) {
            // Check if the email exists in the premium list
            status = "Premium";
          } else if (freemiumEmails.includes(lowercaseEmail)) {
            // Make sure we're checking if the email is in the freemium list
            status = "Freemium";
          }
          
          // Debug log for problem emails
          if (freemiumEmails.includes(lowercaseEmail) && status !== "Freemium") {
            console.log(`Email status issue: ${lowercaseEmail} should be Freemium but is ${status}`);
          }
          
          return {
            email: email,
            name: nameMap[lowercaseEmail] || "",
            status, // Add status field
            practiceTimeSeconds: practiceDuration,
            practiceTimeFormatted: `${hours}h ${minutes}m`
          };
        });
        
        return res.status(200).json({ 
          members,
          total: members.length,
          totalPracticeTimeSeconds,
          totalPracticeTimeFormatted
        });
      } catch (error) {
        console.error("Error retrieving whitelist data:", error);
        return res.status(500).json({ 
          message: "Failed to retrieve whitelist data",
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }
  );
  
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
        
        // Get the user type from the request (defaults to 'freemium' if not specified)
        const userType = (req.body.userType as 'freemium' | 'premium' | 'admin') || 'freemium';
        
        console.log(`Uploading whitelist for user type: ${userType}`);
        
        // Use different protected emails based on user type
        let targetWhitelistPath: string;
        const adminProtectedEmails = ["admin@kasina.app"];
        const premiumProtectedEmails = [
          "premium@kasina.app", // Test premium account
          "brian@terma.asia", 
          "emilywhorn@gmail.com", 
          "ryan@ryanoelke.com",
          "ksowocki@gmail.com"
        ];
        const freemiumProtectedEmails = ["user@kasina.app"];
        
        // Set the target whitelist file based on user type
        switch (userType) {
          case 'admin':
            targetWhitelistPath = adminWhitelistPath;
            break;
          case 'premium':
            targetWhitelistPath = premiumWhitelistPath;
            break;
          case 'freemium':
          default:
            targetWhitelistPath = freemiumWhitelistPath;
            break;
        }
        
        // Parse CSV data
        const records = parse(req.file.buffer, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        
        if (!records || records.length === 0) {
          throw new Error("No data found in the CSV file");
        }
        
        // Determine which column contains emails
        const firstRecord = records[0];
        const possibleEmailColumns = [
          "Email", "email", "EmailAddress", "Email Address", 
          "email_address", "e-mail", "User Email"
        ];
        
        let emailColumnName: string | null = null;
        
        // Find email column
        for (const colName of possibleEmailColumns) {
          if (firstRecord[colName] !== undefined) {
            emailColumnName = colName;
            break;
          }
        }
        
        // Try to find any column containing emails
        if (!emailColumnName) {
          for (const key of Object.keys(firstRecord)) {
            if (firstRecord[key] && firstRecord[key].includes('@')) {
              emailColumnName = key;
              break;
            }
          }
        }
        
        // Last resort: use first column
        if (!emailColumnName && Object.keys(firstRecord).length > 0) {
          emailColumnName = Object.keys(firstRecord)[0];
          console.log(`No email column identified, defaulting to first column: ${emailColumnName}`);
        }
        
        if (!emailColumnName) {
          throw new Error("Could not identify email column in CSV");
        }
        
        console.log(`Using column headers: [ '${emailColumnName}' ]`);
        
        // Create name map for storing user names
        const nameMap: Record<string, string> = {};
        const nameMapPath = path.join(process.cwd(), 'name-map.json');
        let existingNameMap = {};
        
        // Load existing name map if it exists
        try {
          if (fs.existsSync(nameMapPath)) {
            const nameMapData = await fs.promises.readFile(nameMapPath, 'utf-8');
            existingNameMap = JSON.parse(nameMapData);
            console.log(`Loaded ${Object.keys(existingNameMap).length} names from name-map.json`);
          }
        } catch (err) {
          console.warn("Could not read existing name map, creating new one");
        }
        
        // Check if there's a name column
        const nameColumnName = 
          firstRecord.Name !== undefined ? "Name" : 
          firstRecord.name !== undefined ? "name" : 
          firstRecord.FullName !== undefined ? "FullName" :
          firstRecord["Full Name"] !== undefined ? "Full Name" : null;
        
        if (nameColumnName) {
          console.log(`Found name column: ${nameColumnName}`);
        } else {
          console.log("No name column found in the CSV");
        }
        
        // Extract emails from CSV
        const emails: string[] = [];
        for (const record of records) {
          const email = record[emailColumnName];
          
          // Skip if email is missing or doesn't contain @ symbol
          if (!email || !email.includes('@')) {
            continue;
          }
          
          // Normalize email to lowercase
          const normalizedEmail = email.trim().toLowerCase();
          emails.push(normalizedEmail);
          
          // If name column exists, store the name for this email
          if (nameColumnName && record[nameColumnName]) {
            nameMap[normalizedEmail] = record[nameColumnName];
          }
        }
        
        // Check if there are any emails in the data
        if (emails.length === 0) {
          throw new Error("No valid email addresses found in the CSV file");
        }
        
        // Determine which protected emails to include based on user type
        let protectedEmails: string[] = [];
        switch (userType) {
          case 'admin':
            protectedEmails = adminProtectedEmails;
            break;
          case 'premium':
            protectedEmails = premiumProtectedEmails;
            break;
          case 'freemium':
            protectedEmails = freemiumProtectedEmails;
            break;
        }
        
        // Add protected emails to ensure they're never removed
        const emailsWithProtected = [...emails, ...protectedEmails];
        const combinedEmails = Array.from(new Set(emailsWithProtected)) as string[];
        
        console.log(`${userType.toUpperCase()} Whitelist update: ${emails.length} emails in CSV, ${combinedEmails.length} after adding protected accounts`);
        
        // Create CSV content
        const csvContent = [
          "email",
          ...combinedEmails
        ].join("\n");
        
        // Write to the specific whitelist file
        await fs.promises.writeFile(targetWhitelistPath, csvContent, "utf-8");
        
        // Also update legacy whitelist file to maintain backward compatibility
        if (targetWhitelistPath !== whitelistPath) {
          // Read all current whitelist files
          const [currentAdminData, currentPremiumData, currentFreemiumData] = await Promise.all([
            fs.existsSync(adminWhitelistPath) ? fs.promises.readFile(adminWhitelistPath, 'utf-8') : "email",
            fs.existsSync(premiumWhitelistPath) ? fs.promises.readFile(premiumWhitelistPath, 'utf-8') : "email",
            fs.existsSync(freemiumWhitelistPath) ? fs.promises.readFile(freemiumWhitelistPath, 'utf-8') : "email"
          ]);
          
          // Parse whitelist data
          const parseFileData = (data: string): string[] => {
            return data
              .split("\n")
              .map(line => line.trim())
              .filter(line => line && !line.startsWith("#") && line !== "email")
              .map(line => line.toLowerCase()); // Normalize all emails to lowercase
          };
          
          const currentAdminEmails = parseFileData(currentAdminData);
          const currentPremiumEmails = parseFileData(currentPremiumData);
          const currentFreemiumEmails = parseFileData(currentFreemiumData);
          
          // Combine all emails for the legacy whitelist
          const allEmails = Array.from(new Set([
            ...currentAdminEmails,
            ...currentPremiumEmails,
            ...currentFreemiumEmails,
            ...adminProtectedEmails,
            ...premiumProtectedEmails,
            ...freemiumProtectedEmails
          ]));
          
          // Create and write the legacy whitelist
          const legacyCsvContent = [
            "email",
            ...allEmails
          ].join("\n");
          
          await fs.promises.writeFile(whitelistPath, legacyCsvContent, "utf-8");
          console.log(`Updated legacy whitelist with ${allEmails.length} combined emails`);
        }
        
        // Merge and save name map
        const mergedNameMap = { ...existingNameMap, ...nameMap };
        if (Object.keys(mergedNameMap).length > 0) {
          await fs.promises.writeFile(nameMapPath, JSON.stringify(mergedNameMap, null, 2));
          console.log(`Saved ${Object.keys(mergedNameMap).length} names to name-map.json`);
        }
        
        return res.status(200).json({ 
          message: `${userType.charAt(0).toUpperCase() + userType.slice(1)} whitelist updated successfully`, 
          count: combinedEmails.length,
          userType
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
      
      // Check if user exists in database
      const user = await getUserByEmail(email.trim());
      
      if (user) {
        // Store user in session
        if (req.session) {
          req.session.user = { email: user.email };
          await new Promise<void>((resolve, reject) => {
            req.session.save((err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
        
        // Return successful response with user data
        return res.status(200).json({ 
          message: "Login successful",
          user: { 
            email: user.email,
            name: user.name,
            subscription: user.subscription_type
          }
        });
      } else {
        return res.status(403).json({ 
          message: "Become a premium member of contemplative.technology for access. Visit https://www.contemplative.technology/subscribe" 
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
  
  // Delete a user from the whitelist (admin only)
  // New POST-based endpoint for simplicity
  app.post("/api/admin/save-name", (req, res) => {
    // First check authentication
    if (!req.session.user || req.session.user.email !== "admin@kasina.app") {
      return res.json({ 
        success: false, 
        message: "Unauthorized access" 
      });
    }
    
    try {
      const { email, name } = req.body;
      console.log("Processing name update:", { email, name });
      
      if (!email) {
        return res.json({ 
          success: false, 
          message: "Email is required" 
        });
      }
      
      // Load existing name map
      const nameMapPath = path.join(process.cwd(), 'name-map.json');
      let nameMap: Record<string, string> = {};
      
      if (fs.existsSync(nameMapPath)) {
        try {
          const content = fs.readFileSync(nameMapPath, 'utf-8');
          nameMap = JSON.parse(content);
        } catch (e) {
          console.error("Error reading name map:", e);
          nameMap = {}; // Reset to empty if corrupted
        }
      }
      
      // Update name
      const normalizedEmail = email.trim().toLowerCase();
      if (name && name.trim()) {
        nameMap[normalizedEmail] = name.trim();
        console.log(`Updated name for ${normalizedEmail} to "${name.trim()}"`);
      } else if (nameMap[normalizedEmail]) {
        delete nameMap[normalizedEmail];
        console.log(`Removed name entry for ${normalizedEmail}`);
      }
      
      // Save updated map
      fs.writeFileSync(nameMapPath, JSON.stringify(nameMap, null, 2), 'utf-8');
      
      const successMessage = name && name.trim() 
        ? `Successfully updated name for ${email}` 
        : `Successfully removed name for ${email}`;
      
      console.log("Name update success:", successMessage);
      return res.json({ 
        success: true, 
        message: successMessage 
      });
      
    } catch (error) {
      console.error("Error updating user name:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update user name"
      });
    }
  });

  app.delete("/api/admin/delete-user", isAdmin, async (req, res) => {
    try {
      const { email, userType } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const normalizedEmail = email.trim().toLowerCase();
      console.log(`Attempting to delete user: ${normalizedEmail} (${userType})`);
      
      // Protect special accounts from deletion
      // System accounts
      const systemAccounts = ["admin@kasina.app", "premium@kasina.app", "user@kasina.app"];
      // Core premium users that must be preserved
      const protectedPremiumUsers = [
        "brian@terma.asia",
        "emilywhorn@gmail.com",
        "ryan@ryanoelke.com",
        "ksowocki@gmail.com"
      ];
      
      const allProtectedEmails = [...systemAccounts, ...protectedPremiumUsers];
      
      if (allProtectedEmails.includes(normalizedEmail)) {
        return res.status(400).json({ 
          message: "Cannot delete protected user account" 
        });
      }
      
      // Determine which file to remove the email from
      let targetFile: string;
      switch (userType.toLowerCase()) {
        case 'admin':
          targetFile = adminWhitelistPath;
          break;
        case 'premium':
          targetFile = premiumWhitelistPath;
          break;
        case 'freemium':
          targetFile = freemiumWhitelistPath;
          break;
        default:
          targetFile = freemiumWhitelistPath; // Default to freemium
      }
      
      // Read the current whitelist file
      const whitelistData = await fs.promises.readFile(targetFile, 'utf-8');
      
      // Log before deletion
      console.log(`Current whitelist content for ${userType}:`, whitelistData);
      
      // Split into lines and filter out the email to delete
      const lines = whitelistData
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
          // Skip empty lines, keep the email header
          if (!line || line === "email") {
            return line === "email"; // Keep only the email header
          }
          
          // Filter out the email to be deleted (case insensitive)
          return line.toLowerCase() !== normalizedEmail;
        });
      
      // Ensure 'email' header is present at the beginning
      if (!lines.includes("email")) {
        lines.unshift("email");
      } else if (lines.indexOf("email") !== 0) {
        // If email isn't the first element, remove it and put it at the beginning
        lines.splice(lines.indexOf("email"), 1);
        lines.unshift("email");
      }
      
      const updatedContent = lines.join('\n');
      console.log(`Updated whitelist content for ${userType}:`, updatedContent);
      
      // Write the updated whitelist back to the file
      await fs.promises.writeFile(targetFile, updatedContent, 'utf-8');
      
      // Also update the legacy whitelist for backward compatibility
      const legacyWhitelistData = await fs.promises.readFile(whitelistPath, 'utf-8');
      
      // Log before deletion
      console.log(`Current legacy whitelist content:`, legacyWhitelistData);
      
      const legacyLines = legacyWhitelistData
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
          // Skip empty lines, keep the email header
          if (!line || line === "email") {
            return line === "email"; // Keep only the email header
          }
          
          // Filter out the email to be deleted (case insensitive)
          return line.toLowerCase() !== normalizedEmail;
        });
      
      // Ensure 'email' header is present at the beginning
      if (!legacyLines.includes("email")) {
        legacyLines.unshift("email");
      } else if (legacyLines.indexOf("email") !== 0) {
        // If email isn't the first element, remove it and put it at the beginning
        legacyLines.splice(legacyLines.indexOf("email"), 1);
        legacyLines.unshift("email");
      }
      
      const updatedLegacyContent = legacyLines.join('\n');
      console.log(`Updated legacy whitelist content:`, updatedLegacyContent);
      
      await fs.promises.writeFile(whitelistPath, updatedLegacyContent, 'utf-8');
      
      console.log(`Deleted user ${normalizedEmail} from ${userType} whitelist`);
      
      return res.status(200).json({ 
        message: `Successfully deleted ${email} from the ${userType} whitelist` 
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ 
        message: "Failed to delete user",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
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
    
    // CRITICAL WHOLE-MINUTE FIX: Check for special flags for whole-minute sessions
    // Directly handle the force flag before any other processing
    if (req.body._forceWholeMinuteFix) {
      console.log(`🔥 CRITICAL WHOLE-MINUTE SESSION FORCE FIX DETECTED`);
      console.log(`- Duration from flag: ${req.body._duration || 'N/A'}`);
      console.log(`- Minutes value: ${durationInMinutes || 'N/A'}`);
      
      // Get the minutes value from the most reliable source
      const minutes = req.body._duration ? Math.round(req.body._duration / 60) : durationInMinutes;
      console.log(`✅ WHOLE-MINUTE SESSION GUARANTEED: ${minutes} minute(s)`);
    }
    
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
    
    // STEP 1: Start with the most reliable value
    let finalDuration = duration; // Default to parsed duration value
    
    // UNIVERSAL CRITICAL FIX: Check for ANY force flag for whole-minute sessions
    // This section handles all whole-minute sessions regardless of kasina type
    if (req.body._forceOneMinuteFix || req.body._forceWholeMinuteFix || 
        req.body._universalFix || req.body._guaranteedSession || req.body._critical) {
        
      // Log with all possible details
      console.log(`
      🔥🔥🔥 UNIVERSAL WHOLE-MINUTE SESSION FIX DETECTED 🔥🔥🔥
      - Kasina type: ${normalizedType}
      - Original duration: ${duration}s
      - Minutes value: ${durationInMinutes || Math.round(duration / 60)}
      - Force flags: 
        _forceOneMinuteFix: ${!!req.body._forceOneMinuteFix}
        _forceWholeMinuteFix: ${!!req.body._forceWholeMinuteFix}
        _universalFix: ${!!req.body._universalFix}
        _guaranteedSession: ${!!req.body._guaranteedSession}
        _critical: ${!!req.body._critical}
      `);
      
      // Force set the duration based on the most reliable information
      if (req.body._forceOneMinuteFix) {
        console.log(`- Setting duration to EXACTLY 60 seconds (1 minute)`);
        finalDuration = 60;
      } 
      // Use explicit duration if provided
      else if (req.body._duration) {
        console.log(`- Setting duration to EXACTLY ${req.body._duration} seconds`);
        finalDuration = req.body._duration;
      }
      // Use minutes value if provided (most reliable)
      else if (durationInMinutes > 0) {
        const exactSeconds = durationInMinutes * 60;
        console.log(`- Setting duration to EXACTLY ${exactSeconds} seconds (${durationInMinutes} minutes)`);
        finalDuration = exactSeconds;
      }
      // Fallback to rounding the duration to nearest minute
      else {
        const minutes = Math.round(duration / 60);
        const exactSeconds = minutes * 60;
        console.log(`- Setting duration to EXACTLY ${exactSeconds} seconds (${minutes} minutes)`);
        finalDuration = exactSeconds;
      }
      
      // Verify the fix is working
      console.log(`✅ UNIVERSAL WHOLE-MINUTE SESSION FIX - Final duration: ${finalDuration}s`);
    }
    // Check if this came from our direct fix or test
    else if (req.body._directFix || req.body._directTest) {
      console.log(`📦 DIRECT ${req.body._directTest ? 'TEST' : 'FIX'} DETECTED:`);
      console.log(`- Raw Kasina Type: "${rawKasinaType}"`);
      console.log(`- Normalized Type: "${normalizedType}"`);
      console.log(`- Duration: ${duration}s`);
      console.log(`- Minutes: ${durationInMinutes}`);
      console.log(`- Manual Stop: ${req.body._manualStop ? 'Yes' : 'No'}`);
      console.log(`- Test Mode: ${req.body._directTest ? 'Yes' : 'No'}`);
      
      // EMERGENCY DIRECT FIX: If this is a direct test payload, trust the minutes/duration 
      // from the payload completely without any processing
      if (req.body._directTest) {
        console.log(`💯 EMERGENCY DIRECT TEST MODE - Trust payload completely`);
        
        // Get the minutes from the most reliable source
        if (durationInMinutes > 0) {
          console.log(`- Using explicit minutes from payload: ${durationInMinutes}`);
          finalDuration = durationInMinutes * 60;
        } 
        // Otherwise use the duration directly
        else if (duration > 0) {
          console.log(`- Using explicit duration from payload: ${duration}s`);
          finalDuration = duration;
        }
        
        console.log(`💯 DIRECT TEST FINAL DURATION: ${finalDuration}s`);
      }
    }
    
    // ⭐ CRITICAL FIX FOR SPACE KASINA: Add a special emergency fix for Space kasina sessions
    // This is positioned right after all other force flags but before any other processing
    // to ensure it takes priority over all other logic
    if (normalizedType === 'space') {
      console.log("🌟 SPACE KASINA CRITICAL FIX: Detected Space kasina, enabling special handling");
      
      // Log all the flags and values to debug this particular kasina
      console.log(`🌟 SPACE KASINA VALUES: 
        - Raw Duration: ${duration}s
        - Minutes Value: ${durationInMinutes || Math.round(duration / 60)}
        - Has Space Fix Flag: ${!!req.body._spaceKasinaFix}
        - Has Force Fix Flag: ${!!req.body._forceWholeMinuteFix}
        - Has Direct Test Flag: ${!!req.body._directTest}
        - Has Timer Complete Flag: ${!!req.body._timerComplete}
      `);
      
      // For sessions that are explicitly marked as Space kasina fix, apply special rules
      if (req.body._spaceKasinaFix) {
        console.log("🌟 EMERGENCY SPACE KASINA FIX ACTIVATED");
        
        // For 1-minute sessions, force exactly 60 seconds
        if (durationInMinutes === 1 || duration === 60 || (duration > 31 && duration < 60)) {
          console.log("🌟 Forcing Space kasina to exactly 60 seconds (1 minute)");
          finalDuration = 60;
        }
        // For other whole-minute durations (2m, 3m, etc.), preserve exactly
        else if (duration % 60 === 0) {
          console.log(`🌟 Preserving whole-minute Space kasina duration: ${duration}s`);
          finalDuration = duration;
        }
        // For all other durations, round to nearest minute
        else {
          const minutes = Math.round(duration / 60);
          finalDuration = minutes * 60;
          console.log(`🌟 Rounding Space kasina to ${minutes} minutes (${finalDuration}s)`);
        }
        
        console.log("🌟 SPACE KASINA FINAL DURATION:", finalDuration);
      }
    }
    
    // Always override with the normalized type to ensure consistency
    safeBody.kasinaType = normalizedType;
    
    // CRITICAL FIX: Special handling for Space kasina sessions
    if (normalizedType === 'space') {
      console.log("🔮 SPACE KASINA DETECTED - Adding special handling");
      console.log("- Original duration: " + duration + "s");
      
      // Always track space sessions in dedicated debug log
      const spaceDebug = {
        timestamp: new Date().toISOString(),
        originalDuration: duration,
        minutesFromPayload: durationInMinutes || Math.round(duration / 60),
        payloadFlags: {
          forceFix: !!req.body._forceWholeMinuteFix,
          directTest: !!req.body._directTest,
          directFix: !!req.body._directFix,
          timerComplete: !!req.body._timerComplete,
          simpleFix: !!req.body._simpleForceFix
        }
      };
      
      console.log("🔮 SPACE KASINA DEBUG:", JSON.stringify(spaceDebug));
      
      // Special debug mode: If we have force flags, ensure duration is set correctly
      if (req.body._forceWholeMinuteFix || req.body._timerComplete || 
          req.body._directTest || req.body._simpleForceFix) {
        
        console.log("🔮 SPACE KASINA FORCE FIX ENGAGED");
        
        // For special 1-minute case, force to exactly 60 seconds
        if (durationInMinutes === 1 || duration === 60 || 
            (duration > 31 && duration < 60)) {
          console.log("🔮 Forcing SPACE kasina to exactly 60 seconds (1 minute)");
          finalDuration = 60;
        } 
        // For whole-minute durations, preserve exactly
        else if (duration % 60 === 0) {
          console.log(`🔮 Preserving whole-minute SPACE kasina: ${duration}s`);
          finalDuration = duration;
        }
        // In all other cases, round to nearest minute
        else {
          const minutes = Math.round(duration / 60);
          finalDuration = minutes * 60;
          console.log(`🔮 Rounding SPACE kasina to ${minutes} minutes (${finalDuration}s)`);
        }
        
        console.log("🔮 SPACE KASINA FINAL DURATION:", finalDuration);
      }
    }
    
    // Log for yellow kasina sessions for backward compatibility
    if (normalizedType === 'yellow' || kasinaName.includes('yellow')) {
      console.log("🟡 YELLOW KASINA SESSION PROCESSED WITH NORMALIZED TYPE");
    }
    
    // STEP 2: Check if this is a manually stopped session
    // If duration is significantly less than originalDuration, this was likely manually stopped
    if (originalDuration > 0 && duration > 0 && duration < originalDuration * 0.9) {
      console.log(`🔍 Detected manually stopped session - elapsed time: ${duration}s, original duration: ${originalDuration}s`);
      
      // Manual stop flag for clarity in logs
      const isManualStop = true;
      safeBody._manualStop = true;
      
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
      // For all other durations, follow the "30-second threshold" rule
      else {
        // Get the seconds portion of the time
        const seconds = duration % 60;
        const minutes = Math.floor(duration / 60);
        
        // If seconds are >= 30 (not 31), round up to the next minute
        if (seconds >= 30) {
          const roundedMinutes = minutes + 1;
          finalDuration = roundedMinutes * 60;
          console.log(`⏱️ Rounding up ${duration}s to ${roundedMinutes} minutes (${minutes}m ${seconds}s → ${finalDuration}s)`);
        } 
        // Otherwise round down to the current minute
        else {
          finalDuration = minutes * 60;
          console.log(`⏱️ Rounding down ${duration}s to ${minutes} minutes (${minutes}m ${seconds}s → ${finalDuration}s)`);
        }
      }
      
      console.log(`📝 MANUAL STOP: Using actual elapsed time, not originally scheduled time`);
      
      // Add special logging to show what we would have used in the old logic
      if (originalDuration >= 120) {
        const originalMinutes = Math.ceil(originalDuration / 60);
        const actualMinutes = Math.ceil(finalDuration / 60);
        console.log(`📊 Session duration: ${actualMinutes}m instead of originally scheduled ${originalMinutes}m`);
      }
    } else {
      // STEP 3: For completed sessions, use the intended duration from the name or settings
      const minuteMatch = kasinaName.match(/(\d+)[- ]minute/);
      if (minuteMatch && minuteMatch[1]) {
        const extractedMinutes = parseInt(minuteMatch[1], 10);
        if (!isNaN(extractedMinutes) && extractedMinutes > 0) {
          console.log(`💡 Found explicit minute value in name: ${extractedMinutes} minutes`);
          finalDuration = extractedMinutes * 60; // Convert to seconds
          
          // CRITICAL FIX: Special handling for 1 and 2 minute values
          if (extractedMinutes === 1) {
            console.log(`🔧 Special handling for 1-minute timer`);
            // Force exactly 60 seconds
            finalDuration = 60; 
            
            // EMERGENCY FIX FOR 1-MINUTE SESSIONS
            console.log(`🔥 EMERGENCY FIX FOR 1-MINUTE SESSION`);
            
            // Log a critical message to show it's being processed
            console.log(`💯 1-MINUTE SESSION GUARANTEED:
              - Original duration: ${duration}s
              - Minutes from name: ${extractedMinutes}
              - Type: ${safeBody.kasinaType}
              - Force flag present: ${!!safeBody._forceOneMinuteFix}
              - Final duration: ${finalDuration}s 
              - Timestamp: ${new Date().toISOString()}
            `);
          } 
          else if (extractedMinutes === 2) {
            console.log(`🔧 Special handling for 2-minute timer`);
            finalDuration = 120; // Force exactly 120 seconds
          }
        }
      }
      
      // STEP 4: Use explicitly provided duration in minutes - HIGHEST PRIORITY AFTER NAME MATCH
      // This is a reliable source of truth since it's set directly from user input
      if (durationInMinutes > 0) { 
        console.log(`🔥 Using explicitly provided minutes: ${durationInMinutes} minutes`);
        // Override final duration to exactly match what the user entered
        finalDuration = durationInMinutes * 60; // Convert to seconds
        console.log(`💡 Correcting to exactly ${durationInMinutes} minutes (${finalDuration}s)`);
        
        // CRITICAL FIX: Special handling for 1 and 2 minute values
        if (durationInMinutes === 1) {
          console.log(`🔧 Special handling for explicitly set 1-minute timer`);
          finalDuration = 60; // Force exactly 60 seconds
        } 
        else if (durationInMinutes === 2) {
          console.log(`🔧 Special handling for explicitly set 2-minute timer`);
          finalDuration = 120; // Force exactly 120 seconds
        }
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
      
      // CRITICAL FIX: Handle the special case for 120 seconds (2 minutes)
      // For some reason 120s specifically isn't being logged correctly
      if (duration >= 115 && duration <= 125) {
        console.log(`🚨 FIXING CRITICAL 2-MINUTE BUG: ${duration}s → exactly 120s`);
        finalDuration = 120;
      }
      // Similarly, special handling for 1 minute timers
      else if (duration >= 55 && duration <= 65) {
        console.log(`🚨 FIXING CRITICAL 1-MINUTE BUG: ${duration}s → exactly 60s`);
        finalDuration = 60;
      }
      // Otherwise, use the general approach
      else if (Math.abs(finalDuration - exactSeconds) < (exactSeconds * 0.05)) {
        console.log(`💡 Correcting ${finalDuration}s to exactly ${intendedMinutes} minutes (${exactSeconds}s)`);
        finalDuration = exactSeconds;
      }
    }
    
    // CRITICAL USER TRACKING FIX: Always ensure user email is included for accurate practice tracking
    if (req.body._ensureUserTracking && !req.session.user.email) {
      console.log("⚠️ CRITICAL USER TRACKING ERROR: No user email found for session tracking!");
      return res.status(400).json({ 
        message: "User email required for session tracking",
        error: "missing_user_email" 
      });
    }
    
    // Validate finalDuration is sensible
    if (isNaN(finalDuration) || finalDuration <= 0) {
      console.warn("Session too short or invalid duration - not saving");
      // Return a 400 response to indicate that the session is too short
      return res.status(400).json({ 
        message: "Session too short to save - minimum recordable time is 30 seconds",
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
    
    // Check if this is a duplicate session save
    if (isDuplicateSession(req.session.user.email, session.kasinaType, session.duration)) {
      console.log(`⚠️ DUPLICATE SESSION DETECTED: Not saving duplicate ${session.kasinaType} (${Math.round(session.duration/60)}min) session`);
      
      // Return success but inform client it was deduplicated
      return res.status(200).json({
        ...session,
        _deduplicated: true,
        message: "Session detected as duplicate and not saved again"
      });
    }
    
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
  
  // GUARANTEED SESSION SAVING ENDPOINT - Works for any kasina type and duration
  app.post("/api/direct-one-minute-session", (req, res) => {
    if (!req.session?.user?.email) {
      console.log("❌ AUTH ERROR: User not authenticated");
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      // Get the kasina type from the request or default to 'white'
      const kasinaType = (req.body.kasinaType || 'white').toLowerCase();
      
      // Get minutes from request or default to 1 - FIXED to ensure actual duration is used
      const minutes = parseInt(req.body.minutes, 10) || 1;
      
      // Add extra validation to ensure user email is always available
      if (!req.session.user.email) {
        console.log("⚠️ WARNING: Missing user email in session - this should never happen!");
        return res.status(400).json({ message: "User email required for session tracking" });
      }
      
      // Format with proper pluralization
      const minuteText = minutes === 1 ? "minute" : "minutes";
      
      // Log detailed information for debugging
      console.log(`========== GUARANTEED SESSION LOG ==========`);
      console.log(`User: ${req.session.user.email}`);
      console.log(`Kasina: ${kasinaType}`);
      console.log(`Minutes: ${minutes}`);
      console.log(`Request body:`, req.body);
      console.log(`===========================================`);
      
      // Create a guaranteed session - FIXED to ensure proper duration is saved
      const session = {
        id: Date.now().toString(),
        kasinaType: kasinaType,
        kasinaName: `${kasinaType.charAt(0).toUpperCase() + kasinaType.slice(1)} (${minutes}-${minuteText})`,
        duration: minutes * 60, // Convert minutes to seconds - ensures full minutes are logged
        timestamp: new Date().toISOString(),
        userEmail: req.session.user.email
      };
      
      console.log(`🔐 GUARANTEED SESSION LOGGING: Created ${minutes}-minute ${kasinaType} session`);
      
      // Check if this is a duplicate session save
      if (isDuplicateSession(req.session.user.email, kasinaType, minutes * 60)) {
        console.log(`⚠️ DUPLICATE SESSION DETECTED: Not saving duplicate ${kasinaType} (${minutes}min) session`);
        
        // Return success but inform client it was deduplicated
        return res.status(200).json({
          success: true,
          message: `Duplicate session detected - not saved again`,
          session: {
            ...session,
            _deduplicated: true
          }
        });
      }
      
      // Not a duplicate, proceed with saving
      sessions.push(session);
      saveDataToFile(sessionsFilePath, sessions);
      
      console.log(`✅ GUARANTEED SESSION SAVED: ${minutes}-minute ${kasinaType} session for ${req.session.user.email}`);
      
      return res.status(201).json({
        success: true,
        message: `Successfully saved ${minutes}-minute ${kasinaType} kasina session`,
        session
      });
    } catch (error) {
      console.error("⚠️ ERROR in guaranteed session save:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to save session",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // ULTRA RELIABLE FALLBACK ROUTE - Always works even if the client-side code has issues
  app.get("/api/save-session/:kasinaType/:minutes", (req, res) => {
    if (!req.session?.user?.email) {
      console.log("❌ ULTRA FALLBACK - AUTH ERROR: User not authenticated");
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      // Get parameters from URL
      const kasinaType = req.params.kasinaType.toLowerCase();
      const minutes = parseInt(req.params.minutes, 10) || 1;
      
      console.log(`🧨 ULTRA FALLBACK ROUTE CALLED - ${kasinaType} (${minutes} min)`);
      
      // Use the exact same logic as the main endpoint
      const minuteText = minutes === 1 ? "minute" : "minutes";
      
      const session = {
        id: Date.now().toString(),
        kasinaType: kasinaType,
        kasinaName: `${kasinaType.charAt(0).toUpperCase() + kasinaType.slice(1)} (${minutes}-${minuteText})`,
        duration: minutes * 60,
        timestamp: new Date().toISOString(),
        userEmail: req.session.user.email
      };
      
      // Check if this is a duplicate session
      if (isDuplicateSession(req.session.user.email, kasinaType, minutes * 60)) {
        console.log(`⚠️ FALLBACK DUPLICATE DETECTED: Not saving duplicate ${kasinaType} (${minutes}min) session`);
        
        // Return success but inform client it was deduplicated
        return res.status(200).json({
          success: true,
          message: `Duplicate fallback session detected - not saved again`,
          session: {
            ...session,
            _deduplicated: true
          }
        });
      }
      
      // Not a duplicate, proceed with saving
      sessions.push(session);
      saveDataToFile(sessionsFilePath, sessions);
      
      console.log(`🧨 ULTRA FALLBACK: Successfully saved ${minutes}-min ${kasinaType} session`);
      
      return res.status(201).json({
        success: true,
        message: `Successfully saved session through ultra fallback route`,
        session
      });
    } catch (error) {
      console.error("❌ ULTRA FALLBACK ERROR:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to save session through fallback" 
      });
    }
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

  // This is a higher-priority route that will catch Zapier webhook requests
  // before they get redirected to the React app
  app.post("/zapier/webhook/freemium", async (req, res) => {
    try {
      // Security check - require API key for this endpoint
      const providedKey = req.headers['x-api-key'];
      
      // For security, in production you'd use an environment variable or secret store
      const apiKey = process.env.ZAPIER_API_KEY || "kasina-zapier-integration-key";
      
      if (providedKey !== apiKey) {
        console.log("❌ API KEY ERROR: Invalid API key provided for freemium webhook");
        return res.status(401).json({ success: false, message: "Invalid API key" });
      }
      
      // Get email from request
      const { email } = req.body;
      
      // Add email to freemium whitelist
      const result = await addEmailToWhitelist(email, 'freemium');
      
      return res.status(200).json(result);
    } catch (error) {
      console.error("❌ ERROR in Zapier freemium webhook:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to update freemium whitelist",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.post("/zapier/webhook/premium", async (req, res) => {
    try {
      // Security check - require API key for this endpoint
      const providedKey = req.headers['x-api-key'];
      
      // For security, in production you'd use an environment variable or secret store
      const apiKey = process.env.ZAPIER_API_KEY || "kasina-zapier-integration-key";
      
      if (providedKey !== apiKey) {
        console.log("❌ API KEY ERROR: Invalid API key provided for premium webhook");
        return res.status(401).json({ success: false, message: "Invalid API key" });
      }
      
      // Get email from request
      const { email } = req.body;
      
      // Add email to premium whitelist
      const result = await addEmailToWhitelist(email, 'premium');
      
      return res.status(200).json(result);
    } catch (error) {
      console.error("❌ ERROR in Zapier premium webhook:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to update premium whitelist",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Helper function for Zapier whitelist updates
  async function addEmailToWhitelist(email: string, whitelistType: 'freemium' | 'premium') {
    if (!email) {
      throw new Error("Email is required");
    }

    // Normalize the email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Determine which whitelist file to update
    const targetWhitelistPath = whitelistType === 'premium' 
      ? premiumWhitelistPath 
      : freemiumWhitelistPath;
    
    console.log(`📨 ZAPIER WEBHOOK: Adding ${normalizedEmail} to ${whitelistType} whitelist`);
    
    // Read the current whitelist
    let currentEmails: string[] = [];
    
    try {
      if (fs.existsSync(targetWhitelistPath)) {
        const whitelistData = await fs.promises.readFile(targetWhitelistPath, 'utf-8');
        
        // Parse the CSV, skipping empty lines and comments
        currentEmails = whitelistData
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#') && line !== 'email');
      }
    } catch (err) {
      console.warn(`Could not read existing ${whitelistType} whitelist, will create a new one`);
    }
    
    // Check if email is already in the whitelist
    if (currentEmails.includes(normalizedEmail)) {
      console.log(`ℹ️ Email ${normalizedEmail} is already in the ${whitelistType} whitelist`);
      return { 
        success: true, 
        message: `Email already exists in ${whitelistType} whitelist`,
        alreadyExists: true,
        count: currentEmails.length
      };
    }
    
    // Add the new email to the list
    currentEmails.push(normalizedEmail);
    
    // Create the updated CSV content
    const csvContent = [
      "email",
      ...currentEmails
    ].join("\n");
    
    // Write the updated whitelist back to the file
    await fs.promises.writeFile(targetWhitelistPath, csvContent, 'utf-8');
    
    // Also update the legacy whitelist for backward compatibility
    // Read the current legacy whitelist
    let legacyEmails: string[] = [];
    try {
      if (fs.existsSync(whitelistPath)) {
        const legacyData = await fs.promises.readFile(whitelistPath, 'utf-8');
        legacyEmails = legacyData
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#') && line !== 'email');
      }
      
      // Add the new email if it's not already in the legacy whitelist
      if (!legacyEmails.includes(normalizedEmail)) {
        legacyEmails.push(normalizedEmail);
        
        // Create the updated legacy whitelist content
        const legacyContent = [
          "email",
          ...legacyEmails
        ].join("\n");
        
        // Write the updated legacy whitelist
        await fs.promises.writeFile(whitelistPath, legacyContent, 'utf-8');
      }
    } catch (err) {
      console.warn("Could not update legacy whitelist file:", err);
    }
    
    console.log(`✅ SUCCESS: Added ${normalizedEmail} to ${whitelistType} whitelist`);
    console.log(`Updated ${whitelistType} whitelist now has ${currentEmails.length} emails`);
    
    return { 
      success: true, 
      message: `Successfully added ${normalizedEmail} to ${whitelistType} whitelist`,
      count: currentEmails.length
    };
  }

  // Zapier webhook for adding Freemium subscribers
  app.post("/api/webhook/add-freemium-subscriber", async (req, res) => {
    try {
      // Security check - require API key for this endpoint
      const providedKey = req.headers['x-api-key'];
      
      // For security, in production you'd use an environment variable or secret store
      const apiKey = process.env.ZAPIER_API_KEY || "kasina-zapier-integration-key";
      
      if (providedKey !== apiKey) {
        console.log("❌ API KEY ERROR: Invalid API key provided for freemium webhook");
        return res.status(401).json({ success: false, message: "Invalid API key" });
      }
      
      // Get email from request
      const { email } = req.body;
      
      // Validate required fields
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: "Email is required" 
        });
      }
      
      // Add email to freemium whitelist
      const result = await addEmailToWhitelist(email, 'freemium');
      
      return res.status(200).json(result);
    } catch (error) {
      console.error("❌ ERROR in Zapier freemium webhook:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to update freemium whitelist",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Zapier webhook for adding Premium subscribers
  app.post("/api/webhook/add-premium-subscriber", async (req, res) => {
    try {
      // Security check - require API key for this endpoint
      const providedKey = req.headers['x-api-key'];
      
      // For security, in production you'd use an environment variable or secret store
      const apiKey = process.env.ZAPIER_API_KEY || "kasina-zapier-integration-key";
      
      if (providedKey !== apiKey) {
        console.log("❌ API KEY ERROR: Invalid API key provided for premium webhook");
        return res.status(401).json({ success: false, message: "Invalid API key" });
      }
      
      // Get email from request
      const { email } = req.body;
      
      // Validate required fields
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: "Email is required" 
        });
      }
      
      // Add email to premium whitelist
      const result = await addEmailToWhitelist(email, 'premium');
      
      return res.status(200).json(result);
    } catch (error) {
      console.error("❌ ERROR in Zapier premium webhook:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to update premium whitelist",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
