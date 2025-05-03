import { Express, Request, Response } from 'express';
import asyncHandler from '../utils/errorHandler';
import { isAuthenticated } from '../auth';
import { storage } from '../storage';
import { sharedPlantLinks } from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as logger from '../services/logger';

export function setupSharedPlantsRoutes(app: Express) {
  // Create a new shared link for a plant
  app.post('/api/shared-plants', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const { plantId } = req.body;
    
    if (!plantId) {
      return res.status(400).json({ message: 'Plant ID is required' });
    }
    
    // Get the plant to verify it belongs to the user
    const plant = await storage.getPlant(plantId);
    
    if (!plant) {
      return res.status(404).json({ message: 'Plant not found' });
    }
    
    if (plant.userId !== req.user?.id) {
      return res.status(403).json({ message: 'You do not own this plant' });
    }
    
    // Check if there's already an active share link for this plant
    const existingLinks = await storage.getSharedPlantLinksByPlant(plantId);
    const activeLink = existingLinks.find(link => link.active);
    
    if (activeLink) {
      return res.status(200).json(activeLink);
    }
    
    // Create a new shared link
    const sharedLink = await storage.createSharedPlantLink(plantId, req.user.id);
    
    return res.status(201).json(sharedLink);
  }));

  // Get all shared links for the current user
  app.get('/api/shared-plants', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const sharedLinks = await storage.getSharedPlantLinksByUser(userId);
    
    return res.status(200).json(sharedLinks);
  }));

  // Deactivate a shared link
  app.delete('/api/shared-plants/:shareId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const { shareId } = req.params;
    
    const sharedLink = await storage.getSharedPlantLink(shareId);
    
    if (!sharedLink) {
      return res.status(404).json({ message: 'Shared link not found' });
    }
    
    if (sharedLink.userId !== req.user?.id) {
      return res.status(403).json({ message: 'You do not own this shared link' });
    }
    
    const deactivated = await storage.deactivateSharedPlantLink(shareId);
    
    return res.status(200).json({ success: deactivated });
  }));

  // Public route - Get a shared plant by its share ID
  app.get('/api/s/:shareId', asyncHandler(async (req: Request, res: Response) => {
    const { shareId } = req.params;
    
    const plantWithCare = await storage.getSharedPlantWithCare(shareId);
    
    if (!plantWithCare) {
      return res.status(404).json({ message: 'Shared plant not found or link is inactive' });
    }
    
    // Get care logs for the plant
    const careLogs = await storage.getCareLogs(plantWithCare.id);
    
    // Get guide for the plant if one is available
    let guide = null;
    if (plantWithCare.type) {
      guide = await storage.getPlantGuideByType(plantWithCare.type);
    }
    
    return res.status(200).json({
      plant: plantWithCare,
      careLogs,
      guide
    });
  }));
}