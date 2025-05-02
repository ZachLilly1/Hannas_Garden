import OpenAI from "openai";
import { SUNLIGHT_LEVELS } from "@shared/schema";
import * as logger from "./logger";

// Define the type for light level responses
type SunlightLevel = typeof SUNLIGHT_LEVELS[number];

// Initialize OpenAI client with proper error handling
let openai: OpenAI | null = null;
try {
  if (!process.env.OPENAI_API_KEY) {
    logger.warn("OPENAI_API_KEY is not set - AI light analysis features will be limited");
  } else {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    logger.info("OpenAI client initialized for light analyzer service");
  }
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error("Failed to initialize OpenAI client:", new Error(errorMessage));
}

// Analyzes a plant image to determine the sunlight level
export async function analyzePlantImageLightLevel(
  imageBase64: string
): Promise<{
  sunlightLevel: SunlightLevel;
  confidence: "high" | "medium" | "low";
}> {
  try {
    // Check if OpenAI client is initialized
    if (!openai) {
      logger.warn("OpenAI client not available for light analysis - using fallback");
      return {
        sunlightLevel: "medium", // Default to medium as the safest option
        confidence: "low"
      };
    }
    
    // Make sure we have a clean base64 string without the data URL prefix
    let base64Image = imageBase64;
    if (base64Image.includes(",")) {
      base64Image = base64Image.split(",")[1];
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a plant lighting expert. Analyze the provided plant image to determine the light level the plant is currently receiving.
          
          Carefully examine:
          - Visual brightness in the image
          - Shadow patterns (sharp vs. diffused)
          - Plant positioning relative to light sources
          - Any visible windows or light fixtures
          - Plant appearance (stretched stems indicate low light)
          
          Classify the light level into exactly one of these categories:
          - "low": Little light, suitable for shade-tolerant plants (North-facing windows, interior rooms)
          - "medium": Moderate indirect light (East/West-facing windows with filtered light)
          - "high": Bright light including some direct sun (South-facing windows, sunrooms, outdoors)
          
          Your response must be in JSON format with ONLY these fields:
          {
            "sunlightLevel": "low" | "medium" | "high",
            "confidence": "high" | "medium" | "low"
          }`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this plant image and determine the sunlight level it's receiving. Only respond with the JSON format specified, nothing more."
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
      max_tokens: 200,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    // Parse the JSON response
    const result = JSON.parse(content) as {
      sunlightLevel: SunlightLevel;
      confidence: "high" | "medium" | "low";
    };

    // Validate the result
    if (!["low", "medium", "high"].includes(result.sunlightLevel)) {
      throw new Error("Invalid sunlight level in response");
    }

    return result;
  } catch (error) {
    // Properly type the error for logging
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("OpenAI API error during plant light analysis:", error instanceof Error ? error : new Error(errorMessage));
    
    // Return a fallback with low confidence if the API call fails
    return {
      sunlightLevel: "medium", // Default to medium as the safest option
      confidence: "low"
    };
  }
}