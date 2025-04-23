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
    // Prefix for base64 encoded images
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;

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

    // Parse the JSON response
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as PlantIdentificationResult;
  } catch (error) {
    console.error("Error identifying plant:", error);
    throw new Error("Failed to identify plant. Please try again.");
  }
}