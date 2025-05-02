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
      
      // Simple login process - no regeneration or complex error handling
      logger.info("Password matches, logging in user:", username);
      
      // Log the user in manually
      req.login(user, (err) => {
        if (err) {
          logger.error("Error during login:", err);
          return res.status(500).json({ message: "Error during login" });
        }
        
        // Add essential CORS header
        res.header('Access-Control-Allow-Credentials', 'true');
        
        // Save session and return
        req.session.save((saveErr) => {
          if (saveErr) {
            logger.error("Error saving session:", saveErr);
          }
          
          // Return user info without password
          const { password, ...userInfo } = user;
          return res.status(200).json(userInfo);
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