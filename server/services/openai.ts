import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types for plant care recommendations
export interface PlantCareRecommendations {
  commonName: string;
  scientificName: string;
  description: string;
  wateringGuidelines: {
    frequency: number;  // Days between watering
    notes: string;
  };
  sunlightRequirements: {
    level: "low" | "medium" | "high";
    notes: string;
  };
  fertilizerGuidelines: {
    frequency: number;  // Days between fertilizing
    notes: string;
  };
  careTips: string;
  interestingFact: string;
}

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
 * Get detailed care recommendations for a specific plant species
 * @param plantName The scientific or common name of the plant
 * @returns Detailed care recommendations
 */
export async function getPlantCareRecommendations(plantName: string): Promise<PlantCareRecommendations> {
  try {
    console.log(`Getting care recommendations for plant: ${plantName}`);
    
    // Verify API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OpenAI API key is not configured");
    }
    
    // System prompt for plant care recommendations
    const systemPrompt = `
      You are a botanical expert specializing in houseplants and gardening. Provide detailed care 
      information for the specified plant. Return your response as a JSON object with the following structure:
      {
        "commonName": "Common name of the plant",
        "scientificName": "Scientific name (genus and species)",
        "description": "A brief description of the plant (2-3 sentences)",
        "wateringGuidelines": {
          "frequency": number, // Recommended days between watering (e.g. 7 for weekly)
          "notes": "Specific notes about watering this plant (when to water, signs of over/under watering, seasonal changes)"
        },
        "sunlightRequirements": {
          "level": "low" or "medium" or "high", // Choose one
          "notes": "Specific notes about light requirements (best window direction, seasonal adjustments, signs of too much/little light)"
        },
        "fertilizerGuidelines": {
          "frequency": number, // Recommended days between fertilizing (e.g. 30 for monthly)
          "notes": "Specific notes about fertilizing this plant (type of fertilizer, concentration, seasonal changes)"
        },
        "careTips": "Additional species-specific care information (temperature, humidity, soil, propagation, pruning, pests)",
        "interestingFact": "An interesting fact about this plant species"
      }
      
      Be accurate and specific with your recommendations for this particular species.
      When unsure about the exact species, provide information for the most common variety of the plant.
    `;

    // Query OpenAI
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Please provide detailed care recommendations for ${plantName}.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1200,
    });
    
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
    if (!result.commonName || !result.wateringGuidelines || !result.fertilizerGuidelines) {
      console.error("Incomplete plant care recommendations:", result);
      throw new Error("Incomplete plant care recommendations");
    }
    
    console.log("Successfully parsed plant care recommendations");
    return result as PlantCareRecommendations;
  } catch (error) {
    console.error("Error getting plant care recommendations:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to get plant care recommendations. Please try again.");
  }
}

/**
 * Identify a plant from a base64 encoded image
 * @param base64Image Base64 encoded image data (without data:image prefix)
 * @returns Plant identification result
 */
export async function identifyPlantFromImage(base64Image: string): Promise<PlantIdentificationResult> {
  try {
    console.log("Starting plant identification process");
    
    // Check image size
    const imageSizeInBytes = Buffer.from(base64Image, 'base64').length;
    const imageSizeInMB = imageSizeInBytes / (1024 * 1024);
    console.log(`Image size: ${imageSizeInMB.toFixed(2)} MB`);
    
    if (imageSizeInMB > 20) {
      throw new Error(`Image size (${imageSizeInMB.toFixed(2)} MB) exceeds the recommended limit of 20 MB. Please resize the image.`);
    }
    
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
              text: "Please identify this plant."
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
    console.log("Raw OpenAI identification response:", rawContent);

    // Parse the JSON response
    const identificationResult = JSON.parse(rawContent);
    
    // Validate the identification result
    if (!identificationResult.plantType || !identificationResult.commonName || !identificationResult.scientificName) {
      console.error("Incomplete plant identification result:", identificationResult);
      throw new Error("Incomplete plant identification result");
    }
    
    // Now get the specific care recommendations for this plant
    console.log("Getting care recommendations for identified plant");
    const plantName = identificationResult.scientificName;
    const careRecommendations = await getPlantCareRecommendations(plantName);
    
    // Combine the results
    const result: PlantIdentificationResult = {
      plantType: identificationResult.plantType,
      commonName: identificationResult.commonName,
      scientificName: identificationResult.scientificName,
      careRecommendations: {
        waterFrequency: careRecommendations.wateringGuidelines.frequency,
        sunlightLevel: careRecommendations.sunlightRequirements.level,
        fertilizerFrequency: careRecommendations.fertilizerGuidelines.frequency,
        additionalCare: `${careRecommendations.careTips}\n\nWatering: ${careRecommendations.wateringGuidelines.notes}\n\nFertilizing: ${careRecommendations.fertilizerGuidelines.notes}\n\nInteresting Fact: ${careRecommendations.interestingFact}`
      },
      confidence: identificationResult.confidence
    };
    
    console.log("Successfully created comprehensive plant information");
    return result;
  } catch (error) {
    console.error("Error identifying plant:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to identify plant. Please try again.");
  }
}