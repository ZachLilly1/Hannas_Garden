import { Express, Request, Response } from "express";
import { z } from "zod";
import { analyzePlantImageLightLevel } from "../services/lightAnalyzer";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import * as logger from "../services/logger";

// Schema for analyzing plant image
const analyzeImageSchema = z.object({
  plantId: z.number(),
  imageData: z.string()
});

export function setupPlantLightAnalyzerRoutes(app: Express) {
  // Analyze plant image and update sunlight level
  app.post("/api/plants/analyze-light", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Validate request
      const validation = analyzeImageSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: validation.error.format() 
        });
      }

      const { plantId, imageData } = validation.data;

      // Verify plant exists and user has access
      const plant = await storage.getPlant(plantId);
      if (!plant || plant.userId !== req.user?.id) {
        return res.status(404).json({ error: "Plant not found" });
      }

      // Analyze image for light level
      const { sunlightLevel, confidence } = await analyzePlantImageLightLevel(imageData);

      // Only update if confidence is medium or high
      if (confidence !== "low") {
        // Update plant's sunlight level
        await storage.updatePlant(plantId, { sunlightLevel });
      }

      // Return the analysis result
      return res.status(200).json({ sunlightLevel, confidence });
    } catch (error) {
      logger.error("Error analyzing plant light level:", error);
      return res.status(500).json({ 
        error: "Failed to analyze plant light level",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}