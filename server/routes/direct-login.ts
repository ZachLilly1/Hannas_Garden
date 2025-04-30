import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { comparePasswords } from "../auth";

// This creates a temporary direct login route for debugging purposes
export function setupDirectLoginRoute(app: Express) {
  app.post("/api/auth/direct-login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      console.log("Attempting direct login for user:", username);
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log("User not found:", username);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Verify password
      const passwordMatches = await comparePasswords(password, user.password);
      if (!passwordMatches) {
        console.log("Password does not match for user:", username);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Enhanced direct login with additional debugging and safeguards
      console.log("Password matches, attempting to login user:", username);
      console.log("Current session before login:", req.session.id);
      
      // Log the user in manually with extended error handling
      req.login(user, (err) => {
        if (err) {
          console.error("Error during manual login:", err);
          console.error("Login error details:", err.message, err.stack);
          return res.status(500).json({ message: "Error during login", details: err.message });
        }
        
        console.log("User logged in successfully via direct login:", username);
        console.log("Session ID after login:", req.session.id);
        console.log("Is authenticated after login:", req.isAuthenticated());
        
        // Force regenerate session to ensure clean state
        const oldSessionId = req.session.id;
        req.session.regenerate((regenerateErr) => {
          if (regenerateErr) {
            console.error("Error regenerating session:", regenerateErr);
            // Continue despite error
          }
          
          // Re-login after session regeneration
          req.login(user, (loginErr) => {
            if (loginErr) {
              console.error("Error during re-login after session regeneration:", loginErr);
              return res.status(500).json({ message: "Session error during login" });
            }
            
            console.log(`Session regenerated from ${oldSessionId} to ${req.session.id}`);
            
            // Add additional session data to help with persistence
            req.session.loginTime = new Date().toISOString();
            req.session.userIdentifier = username;
            
            // Force session save with extended error handling
            req.session.save((saveErr) => {
              if (saveErr) {
                console.error("Error saving session:", saveErr);
                console.error("Session save error details:", saveErr.message);
                // Continue despite error
              }
              
              // Return user info without password
              const { password, ...userInfo } = user;
              res.status(200).json({
                ...userInfo,
                _loginMethod: "direct",
                _sessionId: req.session.id
              });
            });
          });
        });
      });
    } catch (error) {
      console.error("Direct login error:", error);
      res.status(500).json({ 
        message: "Server error during login", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Direct check route for testing session status
  app.get("/api/auth/session-check", (req: Request, res: Response) => {
    console.log("Session check - Session ID:", req.session.id);
    console.log("Is authenticated:", req.isAuthenticated());
    console.log("Session data:", JSON.stringify(req.session));
    console.log("User in session:", req.user ? req.user.username : "None");
    
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