import { Express, Request, Response } from "express";
import OpenAI from "openai";
import { z } from "zod";
import * as logger from "../services/logger";

// Enhanced schema for light analysis request with better validation
const lightAnalysisSchema = z.object({
  imageData: z.string()
    .min(10, "Image data is too short or missing")
    .refine(
      (data) => data.startsWith('data:image/') || /^[A-Za-z0-9+/=]+$/.test(data),
      "Invalid image data format. Must be a valid base64 string or data URL"
    ),
  rawBrightness: z.number()
    .min(0, "Brightness cannot be negative")
    .max(255, "Brightness cannot exceed 255"),
  correctedBrightness: z.number()
    .min(0, "Corrected brightness cannot be negative")
    .max(255, "Corrected brightness cannot exceed 255"),
  estimatedLux: z.number()
    .min(0, "Lux value cannot be negative")
    .max(150000, "Lux value exceeds normal range"),
  calculatedLevel: z.object({
    name: z.string().min(1, "Level name is required"),
    range: z.tuple([z.number().min(0), z.number().min(0)])
      .refine(([min, max]) => min < max, "Range minimum must be less than maximum"),
    description: z.string().min(1, "Description is required"),
    suitable: z.string().min(1, "Suitable plants information is required")
  })
});

// Interface for OpenAI response
interface LightMeterAIResponse {
  lightLevel: {
    name: string;
    luxRange: [number, number];
    description: string;
  };
  plantRecommendations: {
    recommended: string[];
    notRecommended: string[];
    explanation: string;
  };
  additionalAdvice: string;
  confidence: "high" | "medium" | "low";
}

// Initialize OpenAI client with proper error handling
let openai: OpenAI | null = null;
try {
  if (!process.env.OPENAI_API_KEY) {
    logger.warn("OPENAI_API_KEY is not set - AI light meter features will be limited");
  } else {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    logger.info("OpenAI client initialized for light meter service");
  }
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error("Failed to initialize OpenAI client for light meter:", new Error(errorMessage));
}

export function setupLightMeterRoutes(app: Express) {
  app.post("/api/light-meter/analyze", async (req: Request, res: Response) => {
    try {
      // Validate request
      const validation = lightAnalysisSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: validation.error.format() 
        });
      }

      const { 
        imageData, 
        rawBrightness, 
        correctedBrightness, 
        estimatedLux, 
        calculatedLevel 
      } = validation.data;

      // Extract base64 image data (remove data URL prefix if present)
      let base64Image = imageData;
      if (base64Image.includes(",")) {
        base64Image = base64Image.split(",")[1];
      }

      // Send to OpenAI for analysis
      const analysisResult = await analyzeWithOpenAI(
        base64Image,
        rawBrightness,
        correctedBrightness,
        estimatedLux,
        calculatedLevel
      );

      return res.status(200).json(analysisResult);
    } catch (error) {
      // Consistent error handling pattern
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Error analyzing light level with OpenAI:", error instanceof Error ? error : new Error(errorMessage));
      
      // Check for specific error types to provide better error messages
      if (errorMessage.includes('OpenAI') || errorMessage.includes('API')) {
        return res.status(503).json({
          error: "Light meter analysis service temporarily unavailable",
          message: "The AI analysis service is currently unavailable. Please try again later.",
          code: "SERVICE_UNAVAILABLE"
        });
      }
      
      if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
        return res.status(422).json({
          error: "Invalid response format",
          message: "The service returned an invalid response format. Please try again.",
          code: "INVALID_RESPONSE"
        });
      }
      
      return res.status(500).json({ 
        error: "Failed to analyze light levels",
        message: errorMessage,
        code: "ANALYSIS_FAILED"
      });
    }
  });
}

async function analyzeWithOpenAI(
  base64Image: string,
  rawBrightness: number,
  correctedBrightness: number,
  estimatedLux: number,
  calculatedLevel: {
    name: string;
    range: [number, number];
    description: string;
    suitable: string;
  }
): Promise<LightMeterAIResponse> {
  try {
    // Check if OpenAI client is available
    if (!openai) {
      logger.warn("OpenAI client not available for light meter analysis - using fallback");
      return {
        lightLevel: {
          name: calculatedLevel.name,
          luxRange: calculatedLevel.range,
          description: calculatedLevel.description
        },
        plantRecommendations: {
          recommended: calculatedLevel.suitable.split(", "),
          notRecommended: [],
          explanation: "Based on the calculated light level."
        },
        additionalAdvice: "OpenAI analysis is currently unavailable. Consider using a dedicated light meter for more accurate measurements.",
        confidence: "low"
      };
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional plant light analysis expert. Analyze the provided image and light measurement data to determine the optimal light level classification and appropriate plant recommendations.
          
          Consider both the image itself and the provided brightness measurements.
          
          Important: You should be critical of the estimated lux value which is calculated by a simple algorithm. 
          The image's visual characteristics (shadows, highlights, light sources) are often more reliable than the estimated lux.
          
          Respond with a detailed light level analysis and specific plant suggestions for this environment.
          
          Your response must be in JSON format with the following structure:
          {
            "lightLevel": {
              "name": string,
              "luxRange": [number, number],
              "description": string
            },
            "plantRecommendations": {
              "recommended": string[],
              "notRecommended": string[],
              "explanation": string
            },
            "additionalAdvice": string,
            "confidence": "high" | "medium" | "low"
          }`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please analyze this image for light conditions and respond with JSON. Here are the algorithm measurements:
              - Raw brightness value: ${rawBrightness.toFixed(2)}
              - Corrected brightness: ${correctedBrightness.toFixed(2)}
              - Estimated lux: ${estimatedLux}
              - Algorithm classified as: ${calculatedLevel.name} (${calculatedLevel.range[0]}-${calculatedLevel.range[1]} lux)
              
              Provide your expert analysis on:
              1. The actual light level based on the image
              2. Recommended plants that would thrive in this light
              3. Plants to avoid
              4. Additional advice for this lighting situation
              
              Remember to respond with a valid JSON object containing lightLevel, plantRecommendations, additionalAdvice, and confidence properties.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    // Parse and return the JSON response
    const result = JSON.parse(content) as LightMeterAIResponse;
    return result;
  } catch (error) {
    logger.error("OpenAI API error:", error instanceof Error ? error : new Error(String(error)));
    
    // Fallback response if OpenAI fails
    return {
      lightLevel: {
        name: calculatedLevel.name,
        luxRange: calculatedLevel.range,
        description: calculatedLevel.description
      },
      plantRecommendations: {
        recommended: calculatedLevel.suitable.split(", "),
        notRecommended: [],
        explanation: "Based on the calculated light level."
      },
      additionalAdvice: "Consider using a dedicated light meter for more accurate measurements.",
      confidence: "low"
    };
  }
}