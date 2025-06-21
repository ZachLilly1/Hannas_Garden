import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import path from "path";
import fs from "fs";
import { applyMigrations } from "./migrations";
import { setupSecurityMiddleware } from "./middleware/security";
import * as logger from "./services/logger";
// Session is initialized in auth.ts, not here
import cors from "cors";
import { closeDbConnection } from "./db";
import { globalErrorHandler } from './utils/errorHandler';

// Create Express application
const app = express();

// Production environment flag
const isProduction = process.env.NODE_ENV === 'production';

// Apply comprehensive security middleware (including Helmet)
setupSecurityMiddleware(app);

// Configure CORS with production-optimized settings
app.use(cors({
  // In production, restrict to specific domains; in development, allow any origin
  origin: isProduction 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://your-production-domain.com'] 
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  // Set sensible security headers for CORS
  exposedHeaders: isProduction ? ['Date', 'Content-Length'] : undefined,
  maxAge: isProduction ? 86400 : undefined, // 24 hours in production, default in dev
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

// Production-optimized request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const method = req.method;
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  
  // Capture response details for API logging
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  
  // Only monitor JSON responses in development mode or for error responses in production
  if (!isProduction || req.path.includes('/api/')) {
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      // In production, only capture error responses or basic status info (not full payload)
      if (isProduction) {
        // For security, don't log full response bodies in production except for errors
        if (res.statusCode >= 400) {
          // For errors, only capture essential information
          if (typeof bodyJson === 'object' && bodyJson !== null) {
            capturedJsonResponse = {
              message: bodyJson.message || 'Unknown error',
              code: bodyJson.code || res.statusCode
            };
          } else {
            capturedJsonResponse = { error: String(bodyJson) };
          }
        } else {
          // For successful responses, just note that it was successful
          capturedJsonResponse = { status: 'success' };
        }
      } else {
        // In development, capture the full response for debugging
        capturedJsonResponse = bodyJson;
      }
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    
    // Always log API requests
    if (path.startsWith("/api")) {
      // Basic log info for all environments
      type LogInfo = {
        method: string;
        path: string;
        status: number;
        duration: string;
        ip: string;
        error?: Record<string, any>;
        response?: Record<string, any>;
      };
      
      let logInfo: LogInfo = {
        method,
        path,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: isProduction ? (typeof ip === 'string' ? ip.split(',')[0] : String(ip)) : String(ip)
      };
      
      // Add response data for debugging but be careful in production
      if (capturedJsonResponse) {
        if (isProduction) {
          // In production, only include minimal response info
          if (res.statusCode >= 400) {
            logInfo.error = capturedJsonResponse;
          }
        } else {
          // In development, include full response
          logInfo.response = capturedJsonResponse;
        }
      }
      
      // Format based on environment
      if (isProduction) {
        // Production: structured logging for easier parsing
        logger.info(JSON.stringify(logInfo));
      } else {
        // Development: human-readable format
        let logLine = `${method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (logLine.length > 120) {
          logLine = logLine.slice(0, 119) + "…";
        }
        logger.info(logLine);
      }
    } 
    // In production, also log non-API requests but with minimal info
    else if (isProduction && (res.statusCode >= 400 || method !== 'GET')) {
      const safeIp = typeof ip === 'string' ? ip.split(',')[0] : String(ip);
      logger.info(`${method} ${path} ${res.statusCode} in ${duration}ms from ${safeIp}`);
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

// Global error handler - ensure all errors return JSON with consistent format
app.use(globalErrorHandler);
  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server); // Function is async, need to use await
  } else {
    serveStatic(app);
  }

  // Use the PORT from environment variables, or default to 3000 for local development
  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    logger.info(`Server running at ${protocol}://localhost:${port} (${isProduction ? 'production' : 'development'} mode)`);
  });
  
  // Setup graceful shutdown handlers for production
  if (isProduction) {
    // Create a function to handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      // Set a timeout to force exit if graceful shutdown takes too long
      const forceExitTimeout = setTimeout(() => {
        logger.error('Forcefully shutting down after timeout');
        process.exit(1);
      }, 30000); // 30 seconds timeout
      
      try {
        // Close the HTTP server first (stops accepting new connections)
        logger.info('Closing HTTP server...');
        await new Promise<void>((resolve, reject) => {
          server.close((err) => {
            if (err) {
              logger.error('Error closing HTTP server:', err);
              reject(err);
            } else {
              logger.info('HTTP server closed');
              resolve();
            }
          });
        });
        
        // Clean up database connections
        await closeDbConnection();
        
        clearTimeout(forceExitTimeout);
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error instanceof Error ? error : new Error(String(error)));
        clearTimeout(forceExitTimeout);
        process.exit(1);
      }
    };
    
    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions and unhandled promise rejections
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error instanceof Error ? error : new Error(String(error)));
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection:', 
        reason instanceof Error ? reason : new Error(String(reason)));
      gracefulShutdown('UNHANDLED_REJECTION');
    });
    
    logger.info('Graceful shutdown handlers registered');
  }
})();
