import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types for plant identification response
export interface PlantIdentificationResult {
  plantType: string;
  commonName: string;
  scientificName: string;
  careRecommendations: {
    waterFrequency: number;
    sunlightLevel: "low" | "medium" | "high";
    fertilizerFrequency: number;
    additionalCare: string;
  };
  confidence: "high" | "medium" | "low";
}

/**
 * Identify a plant from a base64 encoded image
 * @param base64Image Base64 encoded image data (without data:image prefix)
 * @returns Plant identification result
 */
export async function identifyPlantFromImage(base64Image: string): Promise<PlantIdentificationResult> {
  try {
    console.log("Starting plant identification process");
    
    // Prefix for base64 encoded images
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;
    console.log("Image URL prepared");

    // System prompt for plant identification
    const systemPrompt = `
      You are a plant identification expert. Analyze the image and identify the plant.
      Return only a JSON object with the following fields:
      - plantType: One of these categories: "tropical", "succulent", "herb", "flowering", "fern", or "other"
      - commonName: The common name of the plant
      - scientificName: The scientific name of the plant
      - careRecommendations: An object containing:
        - waterFrequency: Number of days between watering (e.g., 7 for weekly)
        - sunlightLevel: One of "low", "medium", or "high" 
        - fertilizerFrequency: Number of days between fertilizing (e.g., 30 for monthly)
        - additionalCare: A short string with special care instructions
      - confidence: "high", "medium", or "low" based on your confidence in the identification
    `;

    // Verify API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OpenAI API key is not configured");
    }
    
    console.log("OpenAI API key is configured");
    console.log("Making request to OpenAI API...");

    // Query OpenAI Vision model
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please identify this plant and provide care recommendations."
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    console.log("Received response from OpenAI");
    
    // Check if we got a valid response
    if (!response.choices || response.choices.length === 0) {
      console.error("No choices returned from OpenAI");
      throw new Error("Invalid response from OpenAI");
    }
    
    if (!response.choices[0].message.content) {
      console.error("Empty content in OpenAI response");
      throw new Error("Empty response from OpenAI");
    }
    
    const rawContent = response.choices[0].message.content;
    console.log("Raw OpenAI response:", rawContent);

    // Parse the JSON response
    const result = JSON.parse(rawContent);
    
    // Validate the result
    if (!result.plantType || !result.commonName || !result.careRecommendations) {
      console.error("Incomplete plant identification result:", result);
      throw new Error("Incomplete plant identification result");
    }
    
    console.log("Successfully parsed plant identification result:", result);
    return result as PlantIdentificationResult;
  } catch (error) {
    console.error("Error identifying plant:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to identify plant. Please try again.");
  }
}