import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import fs from "fs";
import { applyMigrations } from "./migrations";
import helmet from "helmet";

const app = express();

// Apply secure headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for development
      connectSrc: ["'self'", "https://api.openai.com"], // Allow connections to OpenAI API
      imgSrc: ["'self'", "data:", "blob:", "https://*"], // Allow image sources from various locations
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  // Disable XSS filter in development since it can interfere with some dev tools
  xssFilter: process.env.NODE_ENV === 'production',
  // Don't force HTTPS in development
  hsts: process.env.NODE_ENV === 'production',
}));

// Increase JSON payload size limit to 50MB for handling image data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploads directory
app.use('/uploads', express.static(uploadsDir));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
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
  // Apply database migrations
  try {
    await applyMigrations();
    log('Database migrations applied successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error applying migrations: ${errorMessage}`, 'error');
    
    // Try to provide more specific error details
    if (errorMessage.includes('connect')) {
      log('Database connection error. Please check DATABASE_URL environment variable.', 'error');
    } else if (errorMessage.includes('permission denied')) {
      log('Database permission error. Please check database user permissions.', 'error');
    } else if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
      log('Schema mismatch error. The database schema needs to be updated.', 'error');
    }
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
