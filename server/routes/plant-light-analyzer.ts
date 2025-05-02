import { Express, Request, Response } from "express";
import { z } from "zod";
import { analyzePlantImageLightLevel } from "../services/lightAnalyzer";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import * as logger from "../services/logger";
import { apiError, ErrorCode, asyncHandler } from "../utils/errorHandler";

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
  app.post("/api/plants/analyze-light", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    // Validate request
    const validation = analyzeImageSchema.safeParse(req.body);
    if (!validation.success) {
      return apiError(res, {
        status: 400,
        error: "Invalid request data",
        message: "The request data failed validation",
        code: ErrorCode.VALIDATION_ERROR,
        details: validation.error.format()
      });
    }

    const { plantId, imageData } = validation.data;

    // Verify plant exists and user has access
    const plant = await storage.getPlant(plantId);
    if (!plant) {
      return apiError(res, {
        status: 404,
        error: "Plant not found",
        message: "The requested plant does not exist",
        code: ErrorCode.NOT_FOUND
      });
    }
    
    // Check user ownership
    if (plant.userId !== req.user?.id) {
      return apiError(res, {
        status: 403,
        error: "Access denied",
        message: "You do not have permission to analyze this plant",
        code: ErrorCode.FORBIDDEN
      });
    }

    try {
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
      // Log the error for monitoring
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Error analyzing plant light level:", error instanceof Error ? error : new Error(errorMessage));
      
      // Categorize the error for proper API responses
      if (errorMessage.includes('OpenAI')) {
        return apiError(res, {
          status: 503,
          error: "Plant light analysis service temporarily unavailable",
          message: "The AI analysis service is currently unavailable. Please try again later.",
          code: ErrorCode.EXTERNAL_SERVICE_ERROR
        });
      }
      
      // Generic error fallback
      return apiError(res, {
        status: 500,
        error: "Failed to analyze plant light level",
        message: "An unexpected error occurred during light analysis",
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        details: { reason: errorMessage }
      });
    }
  }));
}