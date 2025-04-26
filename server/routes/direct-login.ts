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
      
      // Log the user in manually
      req.login(user, (err) => {
        if (err) {
          console.error("Error during manual login:", err);
          return res.status(500).json({ message: "Error during login" });
        }
        
        console.log("User logged in successfully via direct login:", username);
        console.log("Session ID after login:", req.session.id);
        
        // Force session save
        req.session.save((err) => {
          if (err) {
            console.error("Error saving session:", err);
          }
          
          // Return user info without password
          const { password, ...userInfo } = user;
          res.status(200).json({
            ...userInfo,
            _loginMethod: "direct"
          });
        });
      });
    } catch (error) {
      console.error("Direct login error:", error);
      res.status(500).json({ message: "Server error during login" });
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