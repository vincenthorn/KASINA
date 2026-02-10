import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { applyDataMigrations } from "./db";
import session from "express-session";
import memoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { config } from "dotenv";
import crypto from "crypto";

// Load environment variables
config();

// Create session store - use PostgreSQL in production, memory in development
let sessionStore;
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  const PgSession = connectPgSimple(session);
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  sessionStore = new PgSession({
    pool: pgPool,
    tableName: 'session',
    createTableIfMissing: true,
  });
  
  log("Using PostgreSQL session store for production");
} else {
  const MemoryStore = memoryStore(session);
  sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  });
  log("Using memory session store for development");
}

const app = express();

// Security headers to prevent antivirus false positives
app.use((req, res, next) => {
  // Prevent XSS attacks
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy - allow Three.js and WebGL
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self' ws: wss:; " +
    "worker-src 'self' blob:;"
  );
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HSTS for HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup session middleware with fixed configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "kasina-meditation-secret-fallback",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Disable for development, enable for production HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
    store: sessionStore,
    name: 'connect.sid', // Use default session name for compatibility
    proxy: process.env.NODE_ENV === 'production',
  })
);

// Enhanced session debugging middleware
app.use((req, res, next) => {
  if (req.path.includes('/api/auth') || req.path.includes('/admin')) {
    console.log(`🔍 SESSION DEBUG - ${req.method} ${req.path}:`);
    console.log(`  Session ID: ${req.sessionID}`);
    console.log(`  Session exists: ${!!req.session}`);
    console.log(`  User in session: ${!!req.session?.user}`);
    console.log(`  User email: ${req.session?.user?.email}`);
    console.log(`  Cookies: ${req.headers.cookie}`);
    console.log(`  User-Agent: ${req.headers['user-agent']}`);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Log ALL incoming requests for debugging Zapier
  console.log(`📥 INCOMING REQUEST: ${req.method} ${path}`);
  if (path.includes('zapier')) {
    console.log(`📋 ZAPIER HEADERS: ${JSON.stringify(req.headers)}`);
    console.log(`📋 ZAPIER BODY: ${JSON.stringify(req.body)}`);
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api") || path.includes('zapier')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await applyDataMigrations();

  const server = registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error(err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT environment variable for deployment platforms (Render, etc.)
  const port = parseInt(process.env.PORT || "5000");
  
  // Function to find an available port
  const findAvailablePort = (startPort: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      const testServer = server.listen(startPort, "0.0.0.0", () => {
        const actualPort = (testServer.address() as any)?.port || startPort;
        testServer.close(() => resolve(actualPort));
      });
      
      testServer.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          // Try next port
          findAvailablePort(startPort + 1).then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  };

  // Start server with port fallback
  try {
    const availablePort = await findAvailablePort(port);
    server.listen({
      port: availablePort,
      host: "0.0.0.0",
    }, () => {
      log(`KASINA meditation app serving on port ${availablePort}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
