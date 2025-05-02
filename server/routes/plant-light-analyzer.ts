import { Express, Request, Response } from "express";
import { z } from "zod";
import { analyzePlantImageLightLevel } from "../services/lightAnalyzer";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import * as logger from "../services/logger";

// Enhanced schema for analyzing plant image with better validation
const analyzeImageSchema = z.object({
  plantId: z.number().int().positive("Plant ID must be a positive integer"),
  imageData: z.string()
    .min(10, "Image data is too short or missing")
    .refine(
      (data) => data.startsWith('data:image/') || /^[A-Za-z0-9+/=]+$/.test(data),
      "Invalid image data format. Must be a valid base64 string or data URL"
    )
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
      // Consistent error handling pattern
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Error analyzing plant light level:", error);
      
      // Check for specific error types to provide better error messages
      if (errorMessage.includes('OpenAI')) {
        return res.status(503).json({
          error: "Plant light analysis service temporarily unavailable",
          message: "The AI analysis service is currently unavailable. Please try again later.",
          code: "SERVICE_UNAVAILABLE"
        });
      }
      
      return res.status(500).json({ 
        error: "Failed to analyze plant light level",
        message: errorMessage,
        code: "ANALYSIS_FAILED"
      });
    }
  });
}