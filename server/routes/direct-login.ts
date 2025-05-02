import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { comparePasswords } from "../auth";
import * as logger from "../services/logger";

// This creates a temporary direct login route for debugging purposes
export function setupDirectLoginRoute(app: Express) {
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
      
      // Verify password
      const passwordMatches = await comparePasswords(password, user.password);
      if (!passwordMatches) {
        logger.info("Password does not match for user:", username);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      logger.info("Password matches, logging in user:", username);
      
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