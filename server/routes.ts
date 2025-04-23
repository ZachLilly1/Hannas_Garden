import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertPlantSchema, 
  insertCareLogSchema,
  type InsertPlant,
  type InsertCareLog
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  const apiRouter = app;

  // Helper function to validate request body
  function validateRequest<T>(
    schema: z.ZodType<T>,
    req: Request,
    res: Response
  ): { success: true; data: T } | { success: false } {
    try {
      const data = schema.parse(req.body);
      return { success: true, data };
    } catch (error) {
      res.status(400).json({ message: "Invalid request data", error });
      return { success: false };
    }
  }

  // Plant routes
  apiRouter.get("/api/plants", async (req, res) => {
    // For demo, use a fixed userId=1
    const userId = 1;
    const plants = await storage.getPlants(userId);
    res.json(plants);
  });

  apiRouter.get("/api/plants/:id", async (req, res) => {
    const plantId = parseInt(req.params.id);
    if (isNaN(plantId)) {
      return res.status(400).json({ message: "Invalid plant ID" });
    }
    
    const plant = await storage.getPlant(plantId);
    if (!plant) {
      return res.status(404).json({ message: "Plant not found" });
    }
    
    res.json(plant);
  });

  apiRouter.post("/api/plants", async (req, res) => {
    const validation = validateRequest(insertPlantSchema, req, res);
    if (!validation.success) return;
    
    // For demo, use a fixed userId=1
    const plantData: InsertPlant = {
      ...validation.data,
      userId: 1
    };
    
    const plant = await storage.createPlant(plantData);
    res.status(201).json(plant);
  });

  apiRouter.patch("/api/plants/:id", async (req, res) => {
    const plantId = parseInt(req.params.id);
    if (isNaN(plantId)) {
      return res.status(400).json({ message: "Invalid plant ID" });
    }
    
    // Allow partial updates
    const validation = validateRequest(insertPlantSchema.partial(), req, res);
    if (!validation.success) return;
    
    const updatedPlant = await storage.updatePlant(plantId, validation.data);
    if (!updatedPlant) {
      return res.status(404).json({ message: "Plant not found" });
    }
    
    res.json(updatedPlant);
  });

  apiRouter.delete("/api/plants/:id", async (req, res) => {
    const plantId = parseInt(req.params.id);
    if (isNaN(plantId)) {
      return res.status(400).json({ message: "Invalid plant ID" });
    }
    
    const success = await storage.deletePlant(plantId);
    if (!success) {
      return res.status(404).json({ message: "Plant not found" });
    }
    
    res.status(204).send();
  });

  // Care log routes
  apiRouter.get("/api/plants/:id/care-logs", async (req, res) => {
    const plantId = parseInt(req.params.id);
    if (isNaN(plantId)) {
      return res.status(400).json({ message: "Invalid plant ID" });
    }
    
    const logs = await storage.getCareLogs(plantId);
    res.json(logs);
  });

  apiRouter.post("/api/care-logs", async (req, res) => {
    const validation = validateRequest(insertCareLogSchema, req, res);
    if (!validation.success) return;
    
    const careLog = await storage.createCareLog(validation.data);
    res.status(201).json(careLog);
  });

  // Plant guides routes
  apiRouter.get("/api/plant-guides", async (req, res) => {
    const guides = await storage.getPlantGuides();
    res.json(guides);
  });

  apiRouter.get("/api/plant-guides/:type", async (req, res) => {
    const plantType = req.params.type;
    const guide = await storage.getPlantGuideByType(plantType);
    
    if (!guide) {
      return res.status(404).json({ message: "Plant guide not found" });
    }
    
    res.json(guide);
  });

  // Dashboard summary route
  apiRouter.get("/api/dashboard/care-needed", async (req, res) => {
    // For demo, use a fixed userId=1
    const userId = 1;
    const careNeeded = await storage.getPlantsNeedingCare(userId);
    res.json(careNeeded);
  });

  const httpServer = createServer(app);
  return httpServer;
}
