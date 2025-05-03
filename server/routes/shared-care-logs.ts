import { Request, Response, NextFunction, Express } from "express";
import { isAuthenticated } from "../auth";
import { storage } from "../storage";

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export function setupSharedCareLogsRoutes(app: Express) {
  // Create a new shared care log link
  app.post('/api/shared-care-logs', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { careLogId } = req.body;
    
    if (!careLogId) {
      return res.status(400).json({ error: "Care log ID is required" });
    }
    
    try {
      const sharedLink = await storage.createSharedCareLogLink(careLogId, userId);
      res.status(201).json(sharedLink);
    } catch (error) {
      console.error("Error creating shared care log link:", error);
      res.status(500).json({ error: "Failed to create shared care log link" });
    }
  }));
  
  // Get all shared care log links for a user
  app.get('/api/shared-care-logs', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    
    try {
      const sharedLinks = await storage.getSharedCareLogLinksByUser(userId);
      res.json(sharedLinks);
    } catch (error) {
      console.error("Error fetching shared care log links:", error);
      res.status(500).json({ error: "Failed to fetch shared care log links" });
    }
  }));
  
  // Delete a shared care log link
  app.delete('/api/shared-care-logs/:shareId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const { shareId } = req.params;
    
    try {
      const success = await storage.deactivateSharedCareLogLink(shareId);
      if (success) {
        res.status(200).json({ success: true });
      } else {
        res.status(404).json({ error: "Shared care log link not found" });
      }
    } catch (error) {
      console.error("Error deactivating shared care log link:", error);
      res.status(500).json({ error: "Failed to deactivate shared care log link" });
    }
  }));
  
  // Public access to shared care log
  app.get('/api/sc/:shareId', asyncHandler(async (req: Request, res: Response) => {
    const { shareId } = req.params;
    
    try {
      // Update the stats for the shared link (views count and last accessed)
      await storage.updateSharedCareLogLinkStats(shareId);
      
      // Get the care log with plant details
      const sharedData = await storage.getSharedCareLogWithDetails(shareId);
      
      if (!sharedData) {
        return res.status(404).json({ error: "Shared care log not found or has been deactivated" });
      }
      
      res.json(sharedData);
    } catch (error) {
      console.error("Error fetching shared care log:", error);
      res.status(500).json({ error: "Failed to fetch shared care log" });
    }
  }));
}