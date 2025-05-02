/**
 * Security middleware configuration for the application
 * Sets up helmet with proper HTTP security headers and CSP (Content Security Policy)
 */

import helmet from "helmet";
import { Express } from "express";
import * as logger from "../services/logger";

/**
 * Sets up all security middleware for the application
 * @param app Express application instance
 */
export function setupSecurityMiddleware(app: Express): void {
  logger.info("Setting up security middleware");
  
  // Configure security headers with Helmet
  app.use(
    helmet({
      // Enable all helmet defaults
      // This includes XSS Protection, noSniff, hidePoweredBy, etc.
      
      // Content Security Policy - production optimized
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Removed unsafe-eval for production but allow unsafe-inline for certain UI frameworks
          scriptSrc: process.env.NODE_ENV === 'production' 
            ? ["'self'", "'unsafe-inline'"] 
            : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", "https://api.openai.com"],
          frameSrc: ["'self'"],
          objectSrc: ["'none'"],
          // Force HTTPS in production
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      
      // Cross-Origin policies
      crossOriginEmbedderPolicy: false, // Allow loading resources from different origins
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-site" },
      
      // Set referrer policy
      referrerPolicy: {
        policy: ["no-referrer", "strict-origin-when-cross-origin"],
      },
      
      // Configure HSTS (HTTP Strict Transport Security)
      // Only in production to avoid issues with local development
      hsts: process.env.NODE_ENV === "production" 
        ? {
            maxAge: 31536000, // 1 year in seconds
            includeSubDomains: true,
            preload: true,
          }
        : false,
    })
  );
  
  // Add custom security headers not covered by Helmet
  app.use((req, res, next) => {
    // Feature Policy to limit browser features 
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=()"
    );
    
    next();
  });
  
  logger.info("Security middleware setup complete");
}