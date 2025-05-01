import OpenAI from "openai";
import { type CareLog, type PlantWithCare } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ===== ORIGINAL TYPES =====

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
 * Interface for plant health diagnosis results
 */
export interface PlantHealthDiagnosis {
  issue: string;
  cause: string;
  solution: string;
  preventionTips: string[];
  severity: "low" | "medium" | "high";
  confidenceLevel: "low" | "medium" | "high";
}

// ===== NEW FEATURE TYPES =====

// User context for personalized advice
export interface UserEnvironment {
  location?: string;
  indoorTemperature?: number;
  humidity?: number;
  lightConditions?: string;
  averageWateringFrequency?: number;
}

// Simple plant analysis for care logs
export interface SimpleHealthAnalysis {
  healthAssessment: string;
  growthRate: "slow" | "moderate" | "fast";
  careRecommendations: string[];
  confidenceLevel: "low" | "medium" | "high";
}

// Interface for personalized plant advice
export interface PersonalizedAdvice {
  careActions: {
    immediate: string[];
    thisWeek: string[];
    thisMonth: string[];
  };
  observationTips: string[];
  growthExpectations: string;
  seasonalAdjustments: string;
  commonProblems: {
    issue: string;
    symptoms: string;
    solution: string;
  }[];
  successMetrics: string[];
}

// Interface for seasonal care recommendations
export interface SeasonalCareGuide {
  season: string;
  generalRecommendations: string;
  plants: {
    name: string;
    scientificName: string;
    watering: string;
    light: string;
    fertilizing: string;
    pruning: string;
    specialCare: string;
  }[];
}

// Interface for plant arrangement suggestions
export interface ArrangementSuggestion {
  recommendations: {
    grouping: string;
    placement: string;
    aesthetics: string;
    careConsiderations: string;
  };
  plantGroups: {
    name: string;
    plants: string[];
    location: string;
    notes: string;
  }[];
  visualDescription: string;
}

// Interface for enhanced journal entries - simplified
export interface EnhancedJournalEntry {
  title: string;
  observations: string[];
  growthProgress: string;
  plantIdentityMatch?: {
    matches: boolean;
    confidence: "low" | "medium" | "high";
    detectedPlant?: string;
  };
}

// Interface for growth analysis
export interface GrowthAnalysis {
  growthAssessment: string;
  healthChanges: string;
  growthRate: "slow" | "moderate" | "fast";
  potentialIssues: string[];
  recommendations: string[];
  comparisonNotes: string;
}

// Interface for plant care answers
export interface PlantCareAnswer {
  answer: string;
  recommendations: string[];
  relatedPlants?: string[];
  additionalResources?: string[];
  confidenceLevel: "low" | "medium" | "high";
}

// Interface for optimized care schedules
export interface OptimizedCareSchedule {
  weeklySchedule: {
    day: string;
    tasks: {
      plantName: string;
      careType: string;
      estimatedTime: string;
      instructions: string;
    }[];
  }[];
  specialNotes: string[];
  efficiencyTips: string[];
}

// Interface for user schedule
export interface UserSchedule {
  weekdays: { day: string; availableTimeSlots: string[] }[];
  preferences: { preferredTime: string; maxDailyMinutes: number };
}

// Interface for community insights
export interface CommunityInsight {
  plantType: string;
  bestPractices: {
    watering: string;
    light: string;
    soil: string;
    fertilizing: string;
  };
  commonIssues: {
    issue: string;
    frequency: string;
    solutions: string[];
  }[];
  successPatterns: string[];
  overallRecommendations: string;
}

// Interface for anonymized care logs
export interface AnonymizedCareLog {
  plantType: string;
  scientificName: string;
  careType: string;
  frequency: number;
  success: boolean;
  notes?: string;
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
/**
 * Diagnose plant health issues from an image
 * @param base64Image Base64 encoded image data (without data:image prefix)
 * @returns Plant health diagnosis with recommendations
 */
export async function diagnosePlantHealth(base64Image: string): Promise<PlantHealthDiagnosis> {
  try {
    console.log("Starting plant health diagnosis process");
    
    // Check image size
    const buffer = Buffer.from(base64Image, 'base64');
    const imageSizeInMB = buffer.length / (1024 * 1024);
    console.log(`Image size: ${imageSizeInMB.toFixed(2)} MB`);
    
    if (imageSizeInMB > 20) {
      throw new Error(`Image size (${imageSizeInMB.toFixed(2)} MB) exceeds the recommended limit of 20 MB. Please resize the image.`);
    }
    
    // Verify API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OpenAI API key is not configured");
    }
    
    console.log("OpenAI API key is configured");
    
    // Detect image format based on file signature/magic numbers
    let imageFormat = 'jpeg'; // Default format
    if (buffer.length >= 4) {
      const firstBytes = buffer.slice(0, 4);
      
      // Check for PNG signature (89 50 4E 47)
      if (firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && 
          firstBytes[2] === 0x4E && firstBytes[3] === 0x47) {
        imageFormat = 'png';
      }
      // Check for JPEG signature (FF D8)
      else if (firstBytes[0] === 0xFF && firstBytes[1] === 0xD8) {
        imageFormat = 'jpeg';
      }
      // Check for GIF signature (47 49 46)
      else if (firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && 
              firstBytes[2] === 0x46) {
        imageFormat = 'gif';
      }
    }
    
    // Prefix for base64 encoded images with detected format
    const imageUrl = `data:image/${imageFormat};base64,${base64Image}`;
    console.log(`Image URL prepared with format: ${imageFormat}`);
    
    // System message to guide the AI in diagnosing plant health issues
    const systemPrompt = `
      You are an expert plant pathologist and gardening specialist. The user will provide an image of a plant that appears to have health issues.
      Your task is to identify the likely problem, its cause, recommend solutions, and suggest prevention methods.
      
      Analyze the visual symptoms carefully. Look for:
      - Discoloration or spots on leaves
      - Wilting or drooping
      - Unusual growth patterns
      - Signs of pests or disease
      - Leaf curling, browning, or yellowing
      - Stem or root issues
      
      You MUST provide your response as a JSON object with this exact structure:
      {
        "issue": "Brief name of the identified problem",
        "cause": "Detailed explanation of what causes this issue",
        "solution": "Step-by-step recommended treatment",
        "preventionTips": ["Tip 1", "Tip 2", "Tip 3"],
        "severity": "low" | "medium" | "high",
        "confidenceLevel": "low" | "medium" | "high"
      }
    `;

    // Call OpenAI API with the image
    console.log("Making request to OpenAI API for plant health diagnosis...");
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
              text: "My plant doesn't look healthy. What's wrong with it and how can I help it recover?"
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

    console.log("Received response from OpenAI for plant health diagnosis");
    
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
    console.log("Raw OpenAI plant health diagnosis response:", rawContent);

    // Parse JSON response
    const diagnosisData = JSON.parse(rawContent);
    
    // Ensure we have all required fields with fallbacks if needed
    const result: PlantHealthDiagnosis = {
      issue: diagnosisData.issue || "Unidentified plant issue",
      cause: diagnosisData.cause || "The cause could not be determined with confidence from the image.",
      solution: diagnosisData.solution || "Consider consulting a local plant expert for an in-person diagnosis.",
      preventionTips: Array.isArray(diagnosisData.preventionTips) ? diagnosisData.preventionTips : 
        ["Maintain proper watering routine", "Ensure adequate sunlight", "Monitor for early signs of issues"],
      severity: ["low", "medium", "high"].includes(diagnosisData.severity) ? diagnosisData.severity : "medium",
      confidenceLevel: ["low", "medium", "high"].includes(diagnosisData.confidenceLevel) ? diagnosisData.confidenceLevel : "medium"
    };

    console.log("Successfully created plant health diagnosis");
    return result;
  } catch (error) {
    console.error("Error diagnosing plant health:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to diagnose plant health. Please try again.");
  }
}

export async function identifyPlantFromImage(base64Image: string): Promise<PlantIdentificationResult> {
  try {
    console.log("Starting plant identification process");
    
    // Check image size
    const buffer = Buffer.from(base64Image, 'base64');
    const imageSizeInMB = buffer.length / (1024 * 1024);
    console.log(`Image size: ${imageSizeInMB.toFixed(2)} MB`);
    
    if (imageSizeInMB > 20) {
      throw new Error(`Image size (${imageSizeInMB.toFixed(2)} MB) exceeds the recommended limit of 20 MB. Please resize the image.`);
    }
    
    // Detect image format based on file signature/magic numbers
    let imageFormat = 'jpeg'; // Default format
    if (buffer.length >= 4) {
      const firstBytes = buffer.slice(0, 4);
      
      // Check for PNG signature (89 50 4E 47)
      if (firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && 
          firstBytes[2] === 0x4E && firstBytes[3] === 0x47) {
        imageFormat = 'png';
      }
      // Check for JPEG signature (FF D8)
      else if (firstBytes[0] === 0xFF && firstBytes[1] === 0xD8) {
        imageFormat = 'jpeg';
      }
      // Check for GIF signature (47 49 46)
      else if (firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && 
              firstBytes[2] === 0x46) {
        imageFormat = 'gif';
      }
    }
    
    // Prefix for base64 encoded images with detected format
    const imageUrl = `data:image/${imageFormat};base64,${base64Image}`;
    console.log(`Image URL prepared with format: ${imageFormat}`);

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

/**
 * Get personalized care advice for a specific plant based on its care history and environment
 * @param plant The plant to get advice for
 * @param careHistory Recent care logs for the plant
 * @param userEnvironment Information about the user's environment
 * @returns Personalized care advice
 */
export async function getPersonalizedPlantAdvice(
  plant: PlantWithCare, 
  careHistory: CareLog[],
  userEnvironment: UserEnvironment
): Promise<PersonalizedAdvice> {
  try {
    console.log(`Getting personalized advice for plant: ${plant.name} (${plant.scientificName})`);
    
    // Verify API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OpenAI API key is not configured");
    }
    
    // Format care history to last 5 entries
    const recentCare = careHistory.slice(0, 5).map(log => ({
      type: log.careType,
      date: log.timestamp ? new Date(log.timestamp).toISOString().split('T')[0] : 'Unknown',
      notes: log.notes
    }));
    
    // System prompt for personalized plant advice
    const systemPrompt = `
      You are an expert gardener providing personalized plant care advice.
      Analyze the plant's details, care history, and environmental conditions to provide tailored advice.
      You MUST return a JSON object with the following structure:
      {
        "careActions": {
          "immediate": ["Action 1", "Action 2"],
          "thisWeek": ["Action 1", "Action 2"],
          "thisMonth": ["Action 1", "Action 2"]
        },
        "observationTips": ["Tip 1", "Tip 2"],
        "growthExpectations": "What to expect in growth patterns",
        "seasonalAdjustments": "How to adjust care for current/upcoming season",
        "commonProblems": [
          {
            "issue": "Problem name",
            "symptoms": "How to identify",
            "solution": "How to fix"
          }
        ],
        "successMetrics": ["Metric 1", "Metric 2"]
      }
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
          content: `Provide personalized care advice for my ${plant.name} (${plant.scientificName || 'scientific name unknown'}).
            Plant details: 
            - Sunlight level: ${plant.sunlightLevel}
            - Water frequency: Every ${plant.waterFrequency} days
            - Fertilizer frequency: Every ${plant.fertilizerFrequency} days
            - Last watered: ${plant.lastWatered ? new Date(plant.lastWatered).toISOString().split('T')[0] : 'Unknown'}
            - Last fertilized: ${plant.lastFertilized ? new Date(plant.lastFertilized).toISOString().split('T')[0] : 'Unknown'}
            - Current status: ${plant.status}
            - Location: ${plant.location}
            
            Recent care history: ${JSON.stringify(recentCare)}
            
            My environment:
            - Location: ${userEnvironment.location || 'Unknown'}
            - Indoor temperature: ${userEnvironment.indoorTemperature ? userEnvironment.indoorTemperature + '°F' : 'Unknown'}
            - Humidity: ${userEnvironment.humidity ? userEnvironment.humidity + '%' : 'Unknown'}
            - Light conditions: ${userEnvironment.lightConditions || 'Unknown'}
            - Current season: ${getCurrentSeason()}
            `
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
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
    
    // Parse the JSON response
    const result = JSON.parse(rawContent);
    
    // Validate essential fields
    if (!result.careActions || !result.observationTips) {
      console.error("Incomplete personalized plant advice:", result);
      throw new Error("Incomplete personalized plant advice");
    }
    
    return result as PersonalizedAdvice;
  } catch (error) {
    console.error("Error getting personalized plant advice:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to get personalized plant advice. Please try again.");
  }
}

/**
 * Generate seasonal care recommendations based on a collection of plants and location/season
 * @param plants Collection of plants to generate recommendations for
 * @param location User's location
 * @param season Current season
 * @returns Seasonal care recommendations
 */
export async function getSeasonalCareRecommendations(
  plants: PlantWithCare[],
  location: string,
  season: string = getCurrentSeason()
): Promise<SeasonalCareGuide> {
  try {
    console.log(`Getting seasonal care recommendations for ${season} in ${location}`);
    
    // Verify API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OpenAI API key is not configured");
    }
    
    // Format plant list for the prompt
    const plantList = plants.map(p => ({
      name: p.name,
      scientificName: p.scientificName || "Unknown",
      type: p.type || "Unknown",
      sunlight: p.sunlightLevel,
      waterFrequency: p.waterFrequency,
      fertilizerFrequency: p.fertilizerFrequency
    }));
    
    // System prompt for seasonal care recommendations
    const systemPrompt = `
      You are a seasonal plant care expert. Provide detailed recommendations for adjusting plant care
      based on the current season and geographic location.
      Return a JSON object with the following structure:
      {
        "season": "The current season",
        "generalRecommendations": "General advice for this season",
        "plants": [
          {
            "name": "Plant name",
            "scientificName": "Scientific name",
            "watering": "Seasonal watering advice",
            "light": "Seasonal light advice",
            "fertilizing": "Seasonal fertilizing advice",
            "pruning": "Seasonal pruning advice",
            "specialCare": "Any special seasonal considerations"
          }
        ]
      }
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
          content: `Create seasonal care recommendations for ${season} in ${location} for these plants: ${JSON.stringify(plantList)}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
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
    
    // Parse the JSON response
    const result = JSON.parse(rawContent);
    
    // Validation
    if (!result.season || !result.plants || !Array.isArray(result.plants)) {
      console.error("Incomplete seasonal care recommendations:", result);
      throw new Error("Incomplete seasonal care recommendations");
    }
    
    return result as SeasonalCareGuide;
  } catch (error) {
    console.error("Error getting seasonal care recommendations:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to get seasonal care recommendations. Please try again.");
  }
}

/**
 * Generate plant arrangement suggestions based on a collection of plants and space details
 * @param plants Collection of plants to arrange
 * @param spaceType Type of space (e.g., "living room", "balcony")
 * @param spaceSize Size of the space (e.g., "small", "medium", "large")
 * @returns Plant arrangement suggestions
 */
export async function getPlantArrangementSuggestions(
  plants: PlantWithCare[],
  spaceType: string,
  spaceSize: string
): Promise<ArrangementSuggestion> {
  try {
    console.log(`Getting plant arrangement suggestions for ${spaceType} (${spaceSize})`);
    
    // Verify API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OpenAI API key is not configured");
    }
    
    // Format plant list for the prompt
    const plantList = plants.map(p => ({
      name: p.name,
      scientificName: p.scientificName || "Unknown",
      light: p.sunlightLevel,
      waterFrequency: p.waterFrequency,
      type: p.type || "Unknown"
    }));
    
    // System prompt for plant arrangement suggestions
    const systemPrompt = `
      You are an interior designer specializing in plant arrangements. Suggest an optimal arrangement
      for the plants in the specified space, considering both aesthetics and plant care needs.
      Return a JSON object with the following structure:
      {
        "recommendations": {
          "grouping": "How to group plants",
          "placement": "Where to place plants in the space",
          "aesthetics": "Aesthetic recommendations",
          "careConsiderations": "Care considerations for this arrangement"
        },
        "plantGroups": [
          {
            "name": "Group name/theme",
            "plants": ["Plant 1", "Plant 2"],
            "location": "Where in the space",
            "notes": "Special notes for this group"
          }
        ],
        "visualDescription": "A detailed description of what the arrangement would look like"
      }
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
          content: `Suggest how to arrange these plants in my ${spaceType} (${spaceSize}): ${JSON.stringify(plantList)}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
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
    
    // Parse the JSON response
    const result = JSON.parse(rawContent);
    
    // Validation
    if (!result.recommendations || !result.plantGroups) {
      console.error("Incomplete plant arrangement suggestions:", result);
      throw new Error("Incomplete plant arrangement suggestions");
    }
    
    return result as ArrangementSuggestion;
  } catch (error) {
    console.error("Error getting plant arrangement suggestions:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to get plant arrangement suggestions. Please try again.");
  }
}

/**
 * Verify if a plant in a photo matches the expected plant type
 * @param photoUrl URL of the plant photo (data URI or web URL)
 * @param expectedPlantName Name of the expected plant
 * @param expectedScientificName Scientific name of the expected plant (if available)
 * @returns Plant identity match result
 */
export async function verifyPlantIdentity(
  photoUrl: string,
  expectedPlantName: string,
  expectedScientificName?: string
): Promise<{
  matches: boolean;
  confidence: "low" | "medium" | "high";
  detectedPlant?: string;
}> {
  try {
    console.log(`Verifying plant identity in photo - Expected: ${expectedPlantName}`);
    
    // Verify API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OpenAI API key is not configured");
    }
    
    // System prompt for plant verification
    const systemPrompt = `
      You are an expert botanist specializing in plant identification. Analyze the provided 
      image and determine if the plant shown matches the expected plant type.
      
      Return your analysis as a JSON object with this structure:
      {
        "matches": true or false,
        "confidence": "low" | "medium" | "high",
        "detectedPlant": "Name of the plant you identified in the image (if different from expected)",
        "explanation": "Brief explanation of your determination"
      }
    `;
    
    // Call OpenAI API with the image
    console.log("Making request to OpenAI API for plant identity verification...");
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
              text: `Is this plant a ${expectedPlantName}${expectedScientificName ? ` (${expectedScientificName})` : ''}? 
                If not, what plant is it?`
            },
            {
              type: "image_url",
              image_url: {
                url: photoUrl,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });
    
    // Validate response
    if (!response.choices || response.choices.length === 0 || !response.choices[0].message.content) {
      throw new Error("Invalid response from OpenAI");
    }
    
    const rawContent = response.choices[0].message.content;
    const result = JSON.parse(rawContent);
    
    return {
      matches: result.matches === true,
      confidence: ["low", "medium", "high"].includes(result.confidence) ? 
        result.confidence : "medium",
      detectedPlant: result.matches === false ? result.detectedPlant : undefined
    };
  } catch (error) {
    console.error("Error verifying plant identity:", error);
    // Return a default response instead of throwing
    return {
      matches: true, // Default to true to avoid false alarms
      confidence: "low"
    };
  }
}

/**
 * Generate an enhanced journal entry based on a care log
 * @param careLog The care log to enhance
 * @param plant The plant the care log is for
 * @returns Enhanced journal entry
 */
export async function generateJournalEntry(
  careLog: CareLog,
  plant: PlantWithCare,
  careHistory?: CareLog[]
): Promise<EnhancedJournalEntry> {
  try {
    console.log(`Generating journal entry for ${plant.name} care log (${careLog.careType})`);
    
    // Verify API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OpenAI API key is not configured");
    }
    
    // Check if there's a photo and verify plant identity
    let plantIdentityMatch = undefined;
    
    if (careLog.photo) {
      try {
        plantIdentityMatch = await verifyPlantIdentity(
          careLog.photo,
          plant.name,
          plant.scientificName || undefined
        );
        
        console.log(`Plant identity verification result: ${plantIdentityMatch.matches ? 'Match' : 'Mismatch'} (confidence: ${plantIdentityMatch.confidence})`);
      } catch (verifyError) {
        console.error("Error during plant identity verification:", verifyError);
        // Continue without verification result
      }
    }
    
    // Get care history for analysis if not provided
    let careHistoryData = careHistory || [];
    
    // Get care history from database if not provided
    if (!careHistoryData.length) {
      try {
        // Import at use site to avoid circular dependencies
        const { storage } = await import('../storage');
        careHistoryData = await storage.getPlantCareHistory(plant.id, 10);
        
        // Filter out the current care log from history to avoid duplication
        careHistoryData = careHistoryData.filter(log => log.id !== careLog.id);
        
        console.log(`Retrieved ${careHistoryData.length} previous care logs for plant ${plant.id}`);
      } catch (error) {
        console.error("Error retrieving care history:", error);
        // Continue without care history
      }
    }
    
    // Format care history for the prompt
    const careHistoryText = careHistoryData.length > 0 
      ? careHistoryData.map(log => {
          const date = log.timestamp ? new Date(log.timestamp).toISOString().split('T')[0] : 'Unknown date';
          return `- ${date}: ${log.careType}${log.notes ? ` (Notes: "${log.notes}")` : ''}`;
        }).join('\n')
      : "No previous care history available.";
    
    // System prompt for journal entry generation - simplified
    const systemPrompt = `
      You are a plant journaling expert. Create an engaging, detailed journal entry from a basic plant care log.
      Include observations about plant health, suggestions for care improvements, and growth assessment.
      
      IMPORTANT: Use the plant's care history to provide a meaningful analysis that reflects all past care activities.
      For example, if the plant has been watered recently, acknowledge that instead of suggesting a generic watering schedule.
      
      Return a JSON object with the following simplified structure:
      {
        "title": "An engaging title for this journal entry",
        "observations": ["Observation 1", "Observation 2", "Observation 3"],
        "growthProgress": "Detailed notes about the plant's growth progress, focusing on comparing with previous photos if available"
      }
    `;

    // Query OpenAI with retry logic for rate limits
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    const initialBackoff = 1000; // 1 second
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Attempt ${attempts + 1} to generate journal entry...`);
        
        // Simplified prompt for rate limit issues
        const userContent = attempts > 0 
          ? `Create a short journal entry about ${careLog.careType} for my ${plant.name}.
             Recent care: ${careHistoryText.slice(0, 200)}...`
          : `Create a detailed journal entry about ${careLog.careType} for my ${plant.name} (${plant.scientificName || "scientific name unknown"}).
            Care log details:
            - Date: ${careLog.timestamp ? new Date(careLog.timestamp).toISOString().split('T')[0] : 'Unknown'}
            - Care type: ${careLog.careType}
            - Original notes: "${careLog.notes || "No notes provided"}"
            
            Plant details:
            - Sunlight level: ${plant.sunlightLevel}
            - Water frequency: Every ${plant.waterFrequency} days
            - Fertilizer frequency: Every ${plant.fertilizerFrequency} days
            - Current status: ${plant.status}
            - Location: ${plant.location}
            - Last watered: ${plant.lastWatered ? new Date(plant.lastWatered).toISOString().split('T')[0] : 'Unknown'}
            - Last fertilized: ${plant.lastFertilized ? new Date(plant.lastFertilized).toISOString().split('T')[0] : 'Unknown'}
            
            Recent care history (from newest to oldest):
            ${careHistoryText}
            
            Season: ${getCurrentSeason()}
            Today's date: ${new Date().toISOString().split('T')[0]}
          `;
        
        // Lower max_tokens on retry attempts
        const maxTokens = attempts > 0 ? 600 : 1200;
        
        response = await openai.chat.completions.create({
          model: attempts > 0 ? "gpt-3.5-turbo" : MODEL, // Fallback to smaller model after first attempt
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userContent
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: maxTokens,
        });
        
        // Success, break out of the retry loop
        break;
      } catch (error) {
        attempts++;
        
        // Check if it's a rate limit error (with TypeScript error handling)
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'rate_limit_exceeded' && attempts < maxAttempts) {
          // Get retry time from headers or use exponential backoff
          const apiError = error as { headers?: { 'retry-after-ms'?: string }, code: string };
          const retryAfterMs = apiError.headers && apiError.headers['retry-after-ms'] ? 
            parseInt(apiError.headers['retry-after-ms']) : 
            initialBackoff * Math.pow(2, attempts - 1);
          
          console.log(`Rate limit exceeded. Retrying in ${retryAfterMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryAfterMs));
        } else if (attempts >= maxAttempts) {
          console.error(`Failed after ${maxAttempts} attempts:`, error);
          throw error;
        } else {
          // For non-rate-limit errors, rethrow immediately
          throw error;
        }
      }
    }
    
    // Check if we got a valid response
    if (!response || !response.choices || response.choices.length === 0) {
      console.error("No choices returned from OpenAI");
      throw new Error("Invalid response from OpenAI");
    }
    
    if (!response.choices[0].message.content) {
      console.error("Empty content in OpenAI response");
      throw new Error("Empty response from OpenAI");
    }
    
    const rawContent = response.choices[0].message.content;
    
    // Parse the JSON response
    const result = JSON.parse(rawContent);
    
    // Validation for simplified structure
    if (!result.title || !result.observations || !result.growthProgress) {
      console.error("Incomplete journal entry:", result);
      throw new Error("Incomplete journal entry");
    }
    
    // Include plant identity verification result if available
    const journalEntry: EnhancedJournalEntry = {
      ...result,
      plantIdentityMatch
    };
    
    return journalEntry;
  } catch (error) {
    console.error("Error generating journal entry:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to generate journal entry. Please try again.");
  }
}

/**
 * Analyze plant growth progression from a sequence of photos
 * @param imageHistory Array of base64 image data for the same plant over time
 * @param plant The plant in the photos
 * @returns Growth analysis
 */
export async function analyzeGrowthProgression(
  imageHistory: string[], // Array of base64 image data
  plant: PlantWithCare
): Promise<GrowthAnalysis> {
  try {
    console.log(`Analyzing growth progression for ${plant.name} with ${imageHistory.length} images`);
    
    // Need at least 2 images for comparison
    if (imageHistory.length < 2) {
      throw new Error("At least 2 images are required for growth analysis");
    }
    
    // Verify API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OpenAI API key is not configured");
    }
    
    // Use the oldest and newest images
    const oldestImage = imageHistory[0];
    const newestImage = imageHistory[imageHistory.length - 1];
    
    // Prepare image URLs
    const oldestImageUrl = oldestImage.startsWith('data:') 
      ? oldestImage 
      : `data:image/jpeg;base64,${oldestImage}`;
    
    const newestImageUrl = newestImage.startsWith('data:') 
      ? newestImage 
      : `data:image/jpeg;base64,${newestImage}`;
    
    // System prompt for growth analysis
    const systemPrompt = `
      You are a plant growth analysis expert. Compare two images of the same plant taken at different times.
      Analyze growth patterns, health changes, and provide recommendations.
      Return a JSON object with the following structure:
      {
        "growthAssessment": "Overall assessment of the plant's growth",
        "healthChanges": "Any changes in the plant's health",
        "growthRate": "slow" | "moderate" | "fast",
        "potentialIssues": ["Issue 1", "Issue 2"],
        "recommendations": ["Recommendation 1", "Recommendation 2"],
        "comparisonNotes": "Detailed notes comparing the two images"
      }
    `;

    // Query OpenAI with retry and error handling
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    const initialBackoff = 1000; // 1 second
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Attempt ${attempts + 1} to analyze growth progression...`);
        
        // Validate image URLs before sending to prevent invalid URL errors
        const validatedOldestUrl = validateAndFixImageUrl(oldestImageUrl);
        const validatedNewestUrl = validateAndFixImageUrl(newestImageUrl);
        
        if (!validatedOldestUrl || !validatedNewestUrl) {
          throw new Error("Invalid image format for analysis. Only base64 encoded images are supported.");
        }
        
        // Fallback to simpler text-only analysis if first attempt fails
        if (attempts > 0) {
          console.log("Using text-only analysis as fallback");
          response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Use simpler model for fallback
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: `Provide a generic growth analysis for a ${plant.name} (${plant.scientificName || "unknown species"}) based on typical growth patterns for this plant. The user's images couldn't be processed.`
              }
            ],
            response_format: { type: "json_object" },
            max_tokens: 800,
          });
          break;
        }
        
        // Try with full vision analysis first
        response = await openai.chat.completions.create({
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
                  text: `Compare these two images of my ${plant.name} (${plant.scientificName || "unknown species"}) taken ${imageHistory.length} months apart. The first image is the oldest, and the second is the most recent. Analyze growth, health changes, and provide recommendations.`
                },
                {
                  type: "image_url",
                  image_url: { url: validatedOldestUrl }
                },
                {
                  type: "image_url",
                  image_url: { url: validatedNewestUrl }
                }
              ]
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: 1500,
        });
        break;
      } catch (error) {
        attempts++;
        
        // Check if it's a rate limit error (with TypeScript error handling)
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'rate_limit_exceeded' && attempts < maxAttempts) {
          // Get retry time from headers or use exponential backoff
          const apiError = error as { headers?: { 'retry-after-ms'?: string }, code: string };
          const retryAfterMs = apiError.headers && apiError.headers['retry-after-ms'] ? 
            parseInt(apiError.headers['retry-after-ms']) : 
            initialBackoff * Math.pow(2, attempts - 1);
          
          console.log(`Rate limit exceeded. Retrying in ${retryAfterMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryAfterMs));
        } else if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'invalid_image_url' && attempts < maxAttempts) {
          console.error("Invalid image URL, will try text-only analysis next:", error.message);
          // Let the loop continue to try text-only analysis
        } else if (attempts >= maxAttempts) {
          console.error(`Failed after ${maxAttempts} attempts:`, error);
          throw error;
        } else {
          // For other errors, rethrow immediately
          throw error;
        }
      }
    }
    
    // Helper function to validate and fix image URLs
    function validateAndFixImageUrl(url: string): string | null {
      // Check if it's already a valid data URL
      if (url.startsWith('data:image/')) {
        return url;
      }
      
      // Check if it's valid base64 that needs a prefix
      try {
        // Simple check for base64 format
        if (/^[A-Za-z0-9+/=]+$/.test(url)) {
          return `data:image/jpeg;base64,${url}`;
        }
        
        // Return null for invalid formats
        return null;
      } catch (e) {
        console.error("Error validating image URL:", e);
        return null;
      }
    }
    
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
    
    // Parse the JSON response
    const result = JSON.parse(rawContent);
    
    // Validation
    if (!result.growthAssessment || !result.healthChanges) {
      console.error("Incomplete growth analysis:", result);
      throw new Error("Incomplete growth analysis");
    }
    
    return result as GrowthAnalysis;
  } catch (error) {
    console.error("Error analyzing growth progression:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to analyze growth progression. Please try again.");
  }
}

/**
 * Get an answer to a plant care question
 * @param question The question to answer
 * @param plantsInCollection Optional array of plants in the user's collection
 * @returns Answer to the plant care question
 */
export async function getPlantCareAnswer(
  question: string,
  plantsInCollection?: PlantWithCare[]
): Promise<PlantCareAnswer> {
  try {
    console.log(`Getting answer to plant care question: ${question}`);
    
    // Verify API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OpenAI API key is not configured");
    }
    
    // Format plants in collection if provided
    const plantsContext = plantsInCollection 
      ? `User has these plants in their collection: ${plantsInCollection.map(p => p.scientificName || p.name).join(', ')}` 
      : '';
    
    // System prompt for plant care answers
    const systemPrompt = `
      You are a plant care expert providing accurate, concise answers to gardening questions.
      Provide factual, practical advice in a friendly and approachable tone.
      Return a JSON object with the following structure:
      {
        "answer": "A comprehensive answer to the question",
        "recommendations": ["Specific recommendation 1", "Specific recommendation 2"],
        "relatedPlants": ["Plant 1", "Plant 2"], 
        "additionalResources": ["Resource 1", "Resource 2"],
        "confidenceLevel": "low" | "medium" | "high"
      }
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
          content: `${question} ${plantsContext}`
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
    
    // Parse the JSON response
    const result = JSON.parse(rawContent);
    
    // Validation
    if (!result.answer || !result.recommendations) {
      console.error("Incomplete plant care answer:", result);
      throw new Error("Incomplete plant care answer");
    }
    
    return result as PlantCareAnswer;
  } catch (error) {
    console.error("Error getting plant care answer:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to get plant care answer. Please try again.");
  }
}

/**
 * Generate an optimized care schedule based on plant needs and user availability
 * @param plants Array of plants to schedule care for
 * @param userAvailability User's availability information
 * @returns Optimized care schedule
 */
export async function generateOptimizedCareSchedule(
  plants: PlantWithCare[],
  userAvailability: UserSchedule
): Promise<OptimizedCareSchedule> {
  try {
    console.log(`Generating optimized care schedule for ${plants.length} plants`);
    
    // Verify API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OpenAI API key is not configured");
    }
    
    // Format plant data for the prompt
    const plantData = plants.map(p => ({
      name: p.name,
      scientificName: p.scientificName || "Unknown",
      waterFrequency: p.waterFrequency,
      lastWatered: p.lastWatered ? new Date(p.lastWatered).toISOString().split('T')[0] : 'Unknown',
      fertilizerFrequency: p.fertilizerFrequency,
      lastFertilized: p.lastFertilized ? new Date(p.lastFertilized).toISOString().split('T')[0] : 'Unknown',
      sunlightLevel: p.sunlightLevel,
      location: p.location
    }));
    
    // System prompt for optimized care schedules
    const systemPrompt = `
      You are a plant care scheduling expert. Create an optimized weekly care schedule
      that balances plant needs with the user's availability.
      Return a JSON object with the following structure:
      {
        "weeklySchedule": [
          {
            "day": "Monday",
            "tasks": [
              {
                "plantName": "Plant name",
                "careType": "water" | "fertilize" | "prune" | "inspect",
                "estimatedTime": "5 mins",
                "instructions": "Specific instructions"
              }
            ]
          }
        ],
        "specialNotes": ["Special note 1", "Special note 2"],
        "efficiencyTips": ["Efficiency tip 1", "Efficiency tip 2"]
      }
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
          content: `Create a weekly care schedule for my plants based on their needs and my availability.
            Plants: ${JSON.stringify(plantData)}
            
            My available times: ${JSON.stringify(userAvailability)}
            
            Today's date: ${new Date().toISOString().split('T')[0]}
            Current season: ${getCurrentSeason()}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
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
    
    // Parse the JSON response
    const result = JSON.parse(rawContent);
    
    // Validation
    if (!result.weeklySchedule || !Array.isArray(result.weeklySchedule)) {
      console.error("Incomplete care schedule:", result);
      throw new Error("Incomplete care schedule");
    }
    
    return result as OptimizedCareSchedule;
  } catch (error) {
    console.error("Error generating optimized care schedule:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to generate optimized care schedule. Please try again.");
  }
}

/**
 * Generate insights from anonymized care data
 * @param plantType Type of plant to analyze
 * @param anonymizedCareLogs Array of anonymized care logs
 * @returns Community insights
 */
export async function generateCommunityInsights(
  plantType: string,
  anonymizedCareLogs: AnonymizedCareLog[]
): Promise<CommunityInsight> {
  try {
    console.log(`Generating community insights for ${plantType} plants from ${anonymizedCareLogs.length} care logs`);
    
    // Verify API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OpenAI API key is not configured");
    }
    
    // System prompt for community insights
    const systemPrompt = `
      You are a data analyst specializing in plant care trends. Analyze anonymized plant care data
      to identify patterns, best practices, and common issues.
      Return a JSON object with the following structure:
      {
        "plantType": "The type of plant analyzed",
        "bestPractices": {
          "watering": "Best watering practices",
          "light": "Best light practices",
          "soil": "Best soil practices",
          "fertilizing": "Best fertilizing practices"
        },
        "commonIssues": [
          {
            "issue": "Common issue name",
            "frequency": "How often it occurs",
            "solutions": ["Solution 1", "Solution 2"]
          }
        ],
        "successPatterns": ["Success pattern 1", "Success pattern 2"],
        "overallRecommendations": "Overall recommendations based on data"
      }
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
          content: `Based on this anonymized care data for ${plantType} plants, what insights and best practices can be identified? ${JSON.stringify(anonymizedCareLogs)}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
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
    
    // Parse the JSON response
    const result = JSON.parse(rawContent);
    
    // Validation
    if (!result.plantType || !result.bestPractices) {
      console.error("Incomplete community insights:", result);
      throw new Error("Incomplete community insights");
    }
    
    return result as CommunityInsight;
  } catch (error) {
    console.error("Error generating community insights:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to generate community insights. Please try again.");
  }
}

// Helper function to get the current season
export function getCurrentSeason(): string {
  const now = new Date();
  const month = now.getMonth();
  
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Fall";
  return "Winter";
}

/**
 * Analyzes a plant photo and provides a simple health and growth analysis for care logs
 * @param photoUrl URL of the plant photo (data URI or web URL)
 * @param plantName Name of the plant for context
 * @param plantType Type/species of the plant for context
 * @returns A simple health analysis with growth rate and care recommendations
 */
export async function analyzePhotoForCareLog(
  photoUrl: string, 
  plantName: string, 
  plantType: string
): Promise<SimpleHealthAnalysis> {
  try {
    console.log(`Analyzing photo for care log of plant: ${plantName} (${plantType})`);
    
    // Verify API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OpenAI API key is not configured");
    }
    
    // System prompt for simple plant analysis
    const systemPrompt = `
      You are a plant health specialist. You'll analyze a photo of a plant and provide a brief assessment
      of its health and growth rate, along with 2-3 care recommendations.
      
      Return your analysis as a JSON object with this exact structure:
      {
        "healthAssessment": "Brief assessment of the plant's health (1-2 sentences)",
        "growthRate": "slow" | "moderate" | "fast",
        "careRecommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
        "confidenceLevel": "low" | "medium" | "high"
      }
      
      Keep your assessment concise and practical. Focus on actionable care recommendations.
    `;
    
    // Call OpenAI API with the image
    console.log("Making request to OpenAI API for plant photo analysis...");
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
              text: `This is my ${plantType} plant named "${plantName}". Please analyze its health and growth.`
            },
            {
              type: "image_url",
              image_url: {
                url: photoUrl,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });
    
    // Validate response
    if (!response.choices || response.choices.length === 0) {
      console.error("No choices returned from OpenAI");
      throw new Error("Invalid response from OpenAI");
    }
    
    if (!response.choices[0].message.content) {
      console.error("Empty content in OpenAI response");
      throw new Error("Empty response from OpenAI");
    }
    
    const rawContent = response.choices[0].message.content;
    
    // Parse and validate the JSON response
    const analysisData = JSON.parse(rawContent);
    
    // Ensure we have all required fields with fallbacks
    const result: SimpleHealthAnalysis = {
      healthAssessment: analysisData.healthAssessment || 
        "This plant appears to be in average condition. Continue with regular care.",
      growthRate: ["slow", "moderate", "fast"].includes(analysisData.growthRate) ? 
        analysisData.growthRate : "moderate",
      careRecommendations: Array.isArray(analysisData.careRecommendations) && analysisData.careRecommendations.length > 0 ? 
        analysisData.careRecommendations : ["Maintain regular watering schedule", "Monitor for any changes in leaf color or texture"],
      confidenceLevel: ["low", "medium", "high"].includes(analysisData.confidenceLevel) ? 
        analysisData.confidenceLevel : "medium"
    };
    
    console.log("Successfully analyzed plant photo for care log");
    return result;
  } catch (error) {
    console.error("Error analyzing plant photo:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to analyze plant photo. Using default values.");
  }
}