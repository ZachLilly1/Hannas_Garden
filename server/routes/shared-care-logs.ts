import { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import * as logger from "../services/logger";

// Create an async handler function to simplify error handling
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export function setupSharedCareLogsRoutes(app: Express) {
  // Create a shared care log link
  app.post('/api/shared-care-logs', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const { careLogId } = req.body;
    
    if (!careLogId) {
      return res.status(400).json({ message: "Care log ID is required" });
    }
    
    // Verify the care log exists
    const careLog = await storage.getCareLogs(req.body.plantId);
    const foundCareLog = careLog.find(log => log.id === careLogId);
    
    if (!foundCareLog) {
      return res.status(404).json({ message: "Care log not found" });
    }
    
    // Create a shared link
    const sharedLink = await storage.createSharedCareLogLink(careLogId, req.user!.id);
    
    return res.status(201).json(sharedLink);
  }));
  
  // Get all shared care log links for the authenticated user
  app.get('/api/shared-care-logs', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const sharedLinks = await storage.getSharedCareLogLinksByUser(req.user!.id);
    return res.status(200).json(sharedLinks);
  }));
  
  // Delete (deactivate) a shared care log link
  app.delete('/api/shared-care-logs/:shareId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const { shareId } = req.params;
    
    // Verify the shared link exists and belongs to the user
    const sharedLink = await storage.getSharedCareLogLink(shareId);
    
    if (!sharedLink) {
      return res.status(404).json({ message: "Shared link not found" });
    }
    
    if (sharedLink.userId !== req.user!.id) {
      return res.status(403).json({ message: "You don't have permission to delete this shared link" });
    }
    
    const success = await storage.deactivateSharedCareLogLink(shareId);
    
    if (success) {
      return res.status(200).json({ message: "Shared link deactivated successfully" });
    } else {
      return res.status(500).json({ message: "Failed to deactivate shared link" });
    }
  }));
  
  // Access a shared care log using its unique ID (public access)
  app.get('/api/sc/:shareId', asyncHandler(async (req: Request, res: Response) => {
    const { shareId } = req.params;
    
    const sharedCareLog = await storage.getSharedCareLogWithDetails(shareId);
    
    if (!sharedCareLog) {
      return res.status(404).json({ message: "Shared care log not found or link has been deactivated" });
    }
    
    return res.status(200).json(sharedCareLog);
  }));
}