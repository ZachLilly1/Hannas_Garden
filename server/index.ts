import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import path from "path";
import fs from "fs";
import { applyMigrations } from "./migrations";
import { setupSecurityMiddleware } from "./middleware/security";
import * as logger from "./services/logger";
import session from "express-session";
import cors from "cors";

const app = express();

// Apply comprehensive security middleware (including Helmet)
setupSecurityMiddleware(app);

// Allow requests from any origin in development
// In production, this should be restricted to your domain
app.use(cors({
  origin: true, // Allow any origin temporarily for debugging
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
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

      logger.info(logLine);
    }
  });

  next();
});

(async () => {
  // Apply database migrations
  try {
    await applyMigrations();
    logger.info('Database migrations applied successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error applying migrations: ${errorMessage}`);
    
    // Try to provide more specific error details
    if (errorMessage.includes('connect')) {
      logger.error('Database connection error. Please check DATABASE_URL environment variable.');
    } else if (errorMessage.includes('permission denied')) {
      logger.error('Database permission error. Please check database user permissions.');
    } else if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
      logger.error('Schema mismatch error. The database schema needs to be updated.');
    }
  }

  const server = await registerRoutes(app);

app.use(async (err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    logger.error(err); // Using logger.error instead of logger
    return res.status(status).json({ message });
    // no re-throw – prevents duplicate logs / crash
});
  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server); // Function is async, need to use await
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
    logger.info(`serving on port ${port}`);
  });
})();
