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
      
      // Enhanced direct login with additional debugging and safeguards
      logger.info("Password matches, attempting to login user:", username);
      logger.info("Current session before login:", req.session.id);
      
      // Log the user in manually with extended error handling
      req.login(user, (err) => {
        if (err) {
          logger.error("Error during manual login:", err);
          logger.error("Login error details:", err.message, err.stack);
          return res.status(500).json({ message: "Error during login", details: err.message });
        }
        
        logger.info("User logged in successfully via direct login:", username);
        logger.info("Session ID after login:", req.session.id);
        logger.info("Is authenticated after login:", req.isAuthenticated());
        
        // Force regenerate session to ensure clean state
        const oldSessionId = req.session.id;
        req.session.regenerate((regenerateErr) => {
          if (regenerateErr) {
            logger.error("Error regenerating session:", regenerateErr);
            // Continue despite error
          }
          
          // Re-login after session regeneration
          req.login(user, (loginErr) => {
            if (loginErr) {
              logger.error("Error during re-login after session regeneration:", loginErr);
              return res.status(500).json({ message: "Session error during login" });
            }
            
            logger.info(`Session regenerated from ${oldSessionId} to ${req.session.id}`);
            
            // Add additional session data to help with persistence
            // Use type assertion to handle custom session properties
            (req.session as any).loginTime = new Date().toISOString();
            (req.session as any).userIdentifier = username;
            
            // Force session save with extended error handling and improved error recovery
            req.session.save((saveErr) => {
              if (saveErr) {
                logger.error("Error saving session:", saveErr);
                logger.error("Session save error details:", saveErr.message);
                // Continue despite error, but log it clearly
                logger.warn("Proceeding with login despite session save error");
              }
              
              // Add additional headers to help with CORS
              res.header('Access-Control-Allow-Credentials', 'true');
              
              // Return user info without password
              const { password, ...userInfo } = user;
              return res.status(200).json({
                ...userInfo,
                _loginMethod: "direct",
                _sessionId: req.session.id
              });
            });
          });
        });
      });
    } catch (error) {
      logger.error("Direct login error:", error);
      res.status(500).json({ 
        message: "Server error during login", 
        error: error instanceof Error ? error.message : String(error)
      });
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