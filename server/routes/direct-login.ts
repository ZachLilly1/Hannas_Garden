import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { comparePasswords } from "../auth";
import * as logger from "../services/logger";

// This creates a temporary direct login route for debugging purposes
export function setupDirectLoginRoute(app: Express) {
  // Add debug endpoint for troubleshooting authentication issues - available in all environments 
  app.get("/api/auth/debug-auth", async (req: Request, res: Response) => {
    try {
      const isProd = process.env.NODE_ENV === 'production';
      const envInfo = {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        SESSION_SECRET_SET: !!process.env.SESSION_SECRET,
        DATABASE_URL_SET: !!process.env.DATABASE_URL,
        COOKIE_SECURE: isProd,
        COOKIE_SAME_SITE: isProd ? 'strict' : 'lax'
      };
      
      // Get basic environment info without revealing sensitive data
      return res.json({
        environment: envInfo,
        authenticated: req.isAuthenticated(),
        sessionId: req.session?.id || 'No session',
        hasUser: !!req.user,
        session: {
          cookie: req.session?.cookie || 'No cookie',
          passport: req.session && 'passport' in req.session ? true : false
        }
      });
    } catch (error) {
      logger.error("Error in debug endpoint:", error);
      return res.status(500).json({ error: "Server error in debug endpoint" });
    }
  });
  
  // Endpoint to check if a username exists
  app.post("/api/auth/check-username", async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }
      
      const user = await storage.getUserByUsername(username);
      return res.json({ 
        exists: !!user,
        passwordFormat: user ? (user.password.startsWith('$2b$') ? 'bcrypt' : 'scrypt') : null
      });
    } catch (error) {
      logger.error("Error checking username:", error);
      return res.status(500).json({ message: "Server error checking username" });
    }
  });
  
  // Enhanced direct login with more debugging and fallback options
  app.post("/api/auth/direct-login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      logger.info("Attempting direct login for user:", username);
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        logger.info("User not found:", username);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Log password format for debugging
      logger.info(`Password format for ${username}: ${user.password.startsWith('$2b$') ? 'bcrypt' : 'scrypt'}`);
      
      // Normal password verification
      const passwordMatches = await comparePasswords(password, user.password);
      if (!passwordMatches) {
        logger.info("Password does not match for user:", username);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      logger.info("Password verification passed, logging in user:", username);
      
      // First regenerate session to prevent session fixation
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          logger.error("Error regenerating session before login:", regenerateErr);
          return res.status(500).json({ message: "Error establishing secure session" });
        }
        
        // Now login the user with the fresh session
        req.login(user, (loginErr) => {
          if (loginErr) {
            logger.error("Error during login:", loginErr);
            return res.status(500).json({ message: "Error during login" });
          }
          
          // Add CORS headers
          res.header('Access-Control-Allow-Credentials', 'true');
          res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
          
          // Update last login time 
          storage.updateUserLastLogin(user.id)
            .catch(err => logger.error("Failed to update last login time:", err));
          
          // Force session save to ensure data is persisted
          req.session.save((saveErr) => {
            if (saveErr) {
              logger.error("Error saving session:", saveErr);
              // Continue despite error - session might still work
            }
            
            logger.debug(`Login successful, session established: ${req.session.id}`);
            logger.debug(`Session data after login: ${JSON.stringify(req.session)}`);
            
            // Return user info without password
            const { password, ...userInfo } = user;
            return res.status(200).json(userInfo);
          });
        });
      });
    } catch (error) {
      logger.error("Direct login error:", error);
      res.status(500).json({ message: "Server error during login" });
    }
  });
  
  // Direct check route for testing session status
  app.get("/api/auth/session-check", (req: Request, res: Response) => {
    logger.info("Session check - Session ID:", req.session.id);
    logger.info("Is authenticated:", req.isAuthenticated());
    logger.info("Session data:", JSON.stringify(req.session));
    logger.info("User in session:", req.user ? req.user.username : "None");
    
    res.json({
      authenticated: req.isAuthenticated(),
      sessionId: req.session.id,
      user: req.user ? {
        id: req.user.id,
        username: req.user.username
      } : null
    });
  });
}