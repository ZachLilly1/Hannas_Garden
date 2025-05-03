import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { User } from "@shared/schema";
import * as logger from "../services/logger";

/**
 * This creates an emergency login route for production troubleshooting
 * IMPORTANT: This should be removed after fixing any authentication issues
 */
export function setupEmergencyLoginRoute(app: Express) {
  // FOR EMERGENCY USE ONLY - This endpoint allows admin login without password verification
  app.post("/api/auth/emergency-login", async (req: Request, res: Response) => {
    try {
      const { username, password, override } = req.body;
      
      logger.warn("⚠️ ATTEMPTING EMERGENCY LOGIN ⚠️");
      
      // Safety check - verify emergency access code
      if (override !== "PLANT_EMERGENCY_OVERRIDE_2025") {
        logger.warn("Emergency login attempted without proper override code");
        return res.status(401).json({ 
          error: "Invalid access attempt",
          message: "Emergency override requires proper authorization"
        });
      }
      
      // Hard-coded check for expected admin users only
      const isValidEmergency = 
        (username === "Zach" || username === "admin") && 
        (password === "password" || password === "password123");
        
      if (!isValidEmergency) {
        logger.warn(`Invalid emergency credentials used: ${username}`);
        return res.status(401).json({ 
          error: "Invalid credentials",
          message: "Emergency access is restricted to authorized personnel"
        });
      }
      
      // Retrieve the user account
      const user = await storage.getUserByUsername(username);
      if (!user) {
        logger.error(`Emergency login failed: User ${username} not found`);
        return res.status(404).json({ 
          error: "User not found", 
          message: "The specified account does not exist" 
        });
      }
      
      logger.warn(`⚠️ EMERGENCY OVERRIDE: Bypassing authentication for ${username} ⚠️`);
      
      // Force login without password verification
      req.login(user, (loginErr) => {
        if (loginErr) {
          logger.error("Emergency login session error:", loginErr);
          return res.status(500).json({ 
            error: "Session error", 
            message: "Could not establish session" 
          });
        }
        
        logger.warn(`⚠️ EMERGENCY OVERRIDE LOGIN SUCCESSFUL: ${username} ⚠️`);
        
        // Update last login time silently
        storage.updateUserLastLogin(user.id)
          .catch(err => logger.error("Failed to update login timestamp:", err));
        
        // Return user info without password
        const { password, ...userInfo } = user;
        return res.status(200).json({
          ...userInfo,
          _emergency: true,
          message: "EMERGENCY LOGIN SUCCESSFUL - FOR TROUBLESHOOTING ONLY"
        });
      });
    } catch (error) {
      logger.error("Emergency login system error:", error);
      res.status(500).json({ 
        error: "Server error", 
        message: "Emergency login system encountered an error" 
      });
    }
  });
}