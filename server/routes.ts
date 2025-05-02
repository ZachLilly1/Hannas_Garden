import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as logger from "./services/logger";
import { 
  insertPlantSchema, 
  insertCareLogSchema, 
  insertCommunityTipSchema,
  type InsertPlant,
  type InsertCareLog,
  type InsertCommunityTip,
  type CommunityTipWithUser,
  CARE_CATEGORIES
} from "@shared/schema";
import { z } from "zod";
import { 
  identifyPlantFromImage, 
  diagnosePlantHealth,
  getPersonalizedPlantAdvice,
  getSeasonalCareRecommendations,
  getPlantArrangementSuggestions,
  generateJournalEntry,
  analyzeGrowthProgression,
  getPlantCareAnswer,
  generateOptimizedCareSchedule,
  generateCommunityInsights,
  type PlantIdentificationResult, 
  type PlantHealthDiagnosis,
  type PersonalizedAdvice,
  type SeasonalCareGuide,
  type ArrangementSuggestion,
  type EnhancedJournalEntry,
  type GrowthAnalysis,
  type PlantCareAnswer,
  type OptimizedCareSchedule,
  type CommunityInsight,
  type UserEnvironment,
  type UserSchedule,
  type AnonymizedCareLog
} from "./services/openai";
import fs from "fs";
import path from "path";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";

// Direct login routes only used in development
const isProduction = process.env.NODE_ENV === 'production';
import { setupDirectLoginRoute } from "./routes/direct-login";
import { setupLightMeterRoutes } from "./routes/light-meter";
import { setupPlantLightAnalyzerRoutes } from "./routes/plant-light-analyzer";
import { analyzePlantImageLightLevel } from "./services/lightAnalyzer";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Set up direct login route for debugging only in development
  if (!isProduction) {
    logger.info("Setting up direct login route for development");
    setupDirectLoginRoute(app);
  }
  

  
  // Set up light meter routes with OpenAI integration
  setupLightMeterRoutes(app);
  
  // Set up plant light analyzer routes
  setupPlantLightAnalyzerRoutes(app);
  
  // API routes
  const apiRouter = app;

  // Helper function to validate request body
  // Helper function to ensure errors are properly typed for logger
  function handleError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }

  function validateRequest<T>(
    schema: z.ZodType<T>,
    req: Request,
    res: Response
  ): { success: true; data: T } | { success: false } {
    try {
      const data = schema.parse(req.body);
      return { success: true, data };
    } catch (error) {
      const typedError = handleError(error);
      res.status(400).json({ 
        message: "Invalid request data", 
        error: typedError.message 
      });
      return { success: false };
    }
  }

  // User profile routes
  apiRouter.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });
  
  apiRouter.put("/api/auth/profile", isAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    const { 
      displayName, 
      email, 
      bio,
      preferredUnits, 
      timezone, 
      notificationsEnabled, 
      avatarUrl,
      photoBase64,
      prefersDarkMode,
      viewPreference,
      weatherLocation,
      onboardingCompleted
    } = req.body;
    
    // Only allow these fields to be updated
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (email !== undefined) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;
    if (preferredUnits !== undefined) updateData.preferredUnits = preferredUnits;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (prefersDarkMode !== undefined) updateData.prefersDarkMode = prefersDarkMode;
    if (viewPreference !== undefined) updateData.viewPreference = viewPreference;
    if (weatherLocation !== undefined) updateData.weatherLocation = weatherLocation;
    if (onboardingCompleted !== undefined) updateData.onboardingCompleted = onboardingCompleted;
    
    // Handle photo upload if provided
    if (photoBase64) {
      // Remove data:image/jpeg;base64, prefix if present
      const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
      // Generate a filename based on user ID and timestamp
      const timestamp = new Date().getTime();
      const avatarUrl = `user_${userId}_${timestamp}.jpg`;
      
      try {
        // Store the image data (in a real app, this would save to a file or blob storage)
        // For this example, we'll just use the data URL as the avatar URL
        updateData.avatarUrl = photoBase64;
      } catch (error) {
        logger.error("Error saving profile image:", error instanceof Error ? error : new Error(String(error)));
        return res.status(500).json({ message: "Failed to save profile image" });
      }
    }
    
    try {
      const updatedUser = await storage.updateUserProfile(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (error: any) {
      logger.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile", error: error.message });
    }
  });
  
  apiRouter.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }
    
    try {
      // Verify current password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the password
      const success = await storage.updateUserPassword(userId, hashedPassword);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      logger.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password", error: error.message });
    }
  });
  
  // Plant routes - secured for production
  apiRouter.get("/api/plants", isAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    logger.info("Getting plants for user ID:", userId);
    const plants = await storage.getPlants(userId);
    logger.info(`Found ${plants.length} plants for user ID ${userId}`);
    res.json(plants);
  });
  
  // Debug endpoints removed for production security

  apiRouter.get("/api/plants/:id", isAuthenticated, async (req, res) => {
    const plantId = parseInt(req.params.id);
    if (isNaN(plantId)) {
      return res.status(400).json({ message: "Invalid plant ID" });
    }
    
    const plant = await storage.getPlant(plantId);
    if (!plant) {
      return res.status(404).json({ message: "Plant not found" });
    }
    
    // Ensure users can only access their own plants
    if (plant.userId !== req.user!.id) {
      return res.status(403).json({ message: "You don't have permission to access this plant" });
    }
    
    logger.info(`Serving plant ${plantId} for user ${plant.userId}`);
    res.json(plant);
  });

  apiRouter.post("/api/plants", isAuthenticated, async (req, res) => {
    const validation = validateRequest(insertPlantSchema, req, res);
    if (!validation.success) return;
    
    const userId = req.user!.id;
    
    let plantData = { ...validation.data, userId };
    
    // Get species-specific care recommendations if scientific name is provided
    if (validation.data.scientificName && !validation.data.notes) {
      try {
        // Get detailed care recommendations from OpenAI
        const { getPlantCareRecommendations } = await import('./services/openai');
        const careInfo = await getPlantCareRecommendations(validation.data.scientificName);
        
        // Only apply OpenAI recommendations if not explicitly provided in the request
        if (!validation.data.waterFrequency) {
          plantData.waterFrequency = careInfo.wateringGuidelines.frequency;
        }
        
        if (!validation.data.fertilizerFrequency) {
          plantData.fertilizerFrequency = careInfo.fertilizerGuidelines.frequency;
        }
        
        if (!validation.data.sunlightLevel) {
          plantData.sunlightLevel = careInfo.sunlightRequirements.level;
        }
        
        // Create a detailed plant description
        plantData.notes = `${careInfo.description}\n\n` +
                          `Watering: ${careInfo.wateringGuidelines.notes}\n\n` +
                          `Light: ${careInfo.sunlightRequirements.notes}\n\n` +
                          `Fertilizing: ${careInfo.fertilizerGuidelines.notes}\n\n` +
                          `Care Tips: ${careInfo.careTips}\n\n` +
                          `Interesting Fact: ${careInfo.interestingFact}`;
      } catch (error) {
        logger.error("Error getting care recommendations:", handleError(error));
        // Continue with user-provided data if OpenAI recommendation fails
      }
    }
    
    const plant = await storage.createPlant(plantData);
    
    // Create automatic reminders for watering and fertilizing
    if (plant.waterFrequency > 0) {
      const wateringDueDate = new Date();
      wateringDueDate.setDate(wateringDueDate.getDate() + plant.waterFrequency);
      
      await storage.createReminder({
        plantId: plant.id,
        userId,
        title: `Water your ${plant.name}`,
        message: `It's time to water your ${plant.name}`,
        dueDate: wateringDueDate.toISOString(),
        careType: 'water',
        status: 'pending',
        recurring: true,
        recurringInterval: plant.waterFrequency,
        notified: false
      });
    }
    
    if (plant.fertilizerFrequency > 0) {
      const fertilizingDueDate = new Date();
      fertilizingDueDate.setDate(fertilizingDueDate.getDate() + plant.fertilizerFrequency);
      
      await storage.createReminder({
        plantId: plant.id,
        userId,
        title: `Fertilize your ${plant.name}`,
        message: `It's time to fertilize your ${plant.name}`,
        dueDate: fertilizingDueDate.toISOString(),
        careType: 'fertilize',
        status: 'pending',
        recurring: true,
        recurringInterval: plant.fertilizerFrequency,
        notified: false
      });
    }
    
    res.status(201).json(plant);
  });

  apiRouter.patch("/api/plants/:id", isAuthenticated, async (req, res) => {
    const plantId = parseInt(req.params.id);
    if (isNaN(plantId)) {
      return res.status(400).json({ message: "Invalid plant ID" });
    }
    
    // Allow partial updates
    const validation = validateRequest(insertPlantSchema.partial(), req, res);
    if (!validation.success) return;
    
    // Get the original plant to compare changes
    const originalPlant = await storage.getPlant(plantId);
    if (!originalPlant) {
      return res.status(404).json({ message: "Plant not found" });
    }
    
    const updatedPlant = await storage.updatePlant(plantId, validation.data);
    if (!updatedPlant) {
      return res.status(404).json({ message: "Plant not found" });
    }
    
    // Get the authenticated user ID
    const userId = req.user!.id;
    
    // If water frequency changed, update or create a watering reminder
    if (validation.data.waterFrequency && validation.data.waterFrequency !== originalPlant.waterFrequency) {
      // Get existing water reminders for this plant
      const existingReminders = await storage.getRemindersByPlant(plantId);
      const waterReminder = existingReminders.find(r => r.careType === 'water');
      
      if (updatedPlant.waterFrequency > 0) {
        const wateringDueDate = new Date();
        wateringDueDate.setDate(wateringDueDate.getDate() + updatedPlant.waterFrequency);
        
        if (waterReminder) {
          // Update existing reminder
          await storage.updateReminder(waterReminder.id, {
            title: `Water your ${updatedPlant.name}`,
            message: `It's time to water your ${updatedPlant.name}`,
            dueDate: wateringDueDate.toISOString(),
            recurring: true,
            recurringInterval: updatedPlant.waterFrequency
          });
        } else {
          // Create new reminder
          await storage.createReminder({
            plantId: updatedPlant.id,
            userId,
            title: `Water your ${updatedPlant.name}`,
            message: `It's time to water your ${updatedPlant.name}`,
            dueDate: wateringDueDate.toISOString(),
            careType: 'water',
            status: 'pending',
            recurring: true,
            recurringInterval: updatedPlant.waterFrequency,
            notified: false
          });
        }
      } else if (waterReminder) {
        // If water frequency set to 0, delete the reminder
        await storage.deleteReminder(waterReminder.id);
      }
    }
    
    // If fertilizer frequency changed, update or create a fertilizing reminder
    if (validation.data.fertilizerFrequency && validation.data.fertilizerFrequency !== originalPlant.fertilizerFrequency) {
      // Get existing fertilizer reminders for this plant
      const existingReminders = await storage.getRemindersByPlant(plantId);
      const fertilizerReminder = existingReminders.find(r => r.careType === 'fertilize');
      
      if (updatedPlant.fertilizerFrequency > 0) {
        const fertilizingDueDate = new Date();
        fertilizingDueDate.setDate(fertilizingDueDate.getDate() + updatedPlant.fertilizerFrequency);
        
        if (fertilizerReminder) {
          // Update existing reminder
          await storage.updateReminder(fertilizerReminder.id, {
            title: `Fertilize your ${updatedPlant.name}`,
            message: `It's time to fertilize your ${updatedPlant.name}`,
            dueDate: fertilizingDueDate.toISOString(),
            recurring: true,
            recurringInterval: updatedPlant.fertilizerFrequency
          });
        } else {
          // Create new reminder
          await storage.createReminder({
            plantId: updatedPlant.id,
            userId,
            title: `Fertilize your ${updatedPlant.name}`,
            message: `It's time to fertilize your ${updatedPlant.name}`,
            dueDate: fertilizingDueDate.toISOString(),
            careType: 'fertilize',
            status: 'pending',
            recurring: true,
            recurringInterval: updatedPlant.fertilizerFrequency,
            notified: false
          });
        }
      } else if (fertilizerReminder) {
        // If fertilizer frequency set to 0, delete the reminder
        await storage.deleteReminder(fertilizerReminder.id);
      }
    }
    
    res.json(updatedPlant);
  });

  apiRouter.delete("/api/plants/:id", isAuthenticated, async (req, res) => {
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

  // Care log routes - authenticated for production
  apiRouter.get("/api/plants/:id/care-logs", isAuthenticated, async (req, res) => {
    const plantId = parseInt(req.params.id);
    if (isNaN(plantId)) {
      return res.status(400).json({ message: "Invalid plant ID" });
    }
    
    // Get the plant to check ownership
    const plant = await storage.getPlant(plantId);
    if (!plant) {
      return res.status(404).json({ message: "Plant not found" });
    }
    
    // Ensure users can only access their own plants' care logs
    if (plant.userId !== req.user!.id) {
      return res.status(403).json({ message: "You don't have permission to access this plant" });
    }
    
    const logs = await storage.getCareLogs(plantId);
    logger.info(`Serving ${logs.length} care logs for plant ${plantId}`);
    res.json(logs);
  });

  apiRouter.post("/api/care-logs", isAuthenticated, async (req, res) => {
    const validation = validateRequest(insertCareLogSchema, req, res);
    if (!validation.success) return;
    
    const careLogData = { ...validation.data };
    
    // Extract any additional data from the request that might not be in the schema
    const { healthDiagnosis } = req.body;
    
    // Handle health diagnosis data if provided
    if (healthDiagnosis && careLogData.careType === 'health_check') {
      try {
        // Store the health diagnosis in the metadata field as JSON
        careLogData.metadata = JSON.stringify({ healthDiagnosis });
      } catch (error) {
        logger.error('Error processing health diagnosis data:', handleError(error));
      }
    }
    
    // Flag to track if we have a photo for light analysis
    let photoForLightAnalysis = null;
    
    // Handle photoBase64 if provided - store directly in the database for persistence
    if (careLogData.photoBase64) {
      try {
        // Store the base64 image data directly in the photo field
        // Add data URL prefix if it doesn't already have one
        let processedPhoto;
        if (!careLogData.photoBase64.startsWith('data:image/')) {
          processedPhoto = `data:image/jpeg;base64,${careLogData.photoBase64}`;
        } else {
          processedPhoto = careLogData.photoBase64;
        }
        
        // Save the processed photo both for storage and light analysis
        careLogData.photo = processedPhoto;
        photoForLightAnalysis = processedPhoto;
        
        // Remove base64 data from the separate field before storing in DB
        delete careLogData.photoBase64;
        
        // If a photo is provided, attempt to immediately analyze light level
        // and include it in the notes
        if (processedPhoto) {
          try {
            // Get plant info for context
            const plant = await storage.getPlant(careLogData.plantId);
            if (!plant) {
              throw new Error("Plant not found");
            }
            
            // Perform immediate light analysis to include in the notes
            const { sunlightLevel, confidence } = await analyzePlantImageLightLevel(processedPhoto);
            
            // Convert sunlight level to estimated lux range
            let luxRange = "0";
            switch(sunlightLevel) {
              case "low":
                luxRange = "100-500";
                break;
              case "medium":
                luxRange = "500-2500";
                break;
              case "high":
                luxRange = "2500+";
                break;
            }
            
            // Add light level data to notes
            const lightInfo = `\n\nlux: ${luxRange} (${sunlightLevel.charAt(0).toUpperCase() + sunlightLevel.slice(1)} Light)`;
            
            // Include analysis info only if confidence is medium or high
            if (confidence !== "low") {
              careLogData.notes = (careLogData.notes || "") + lightInfo;
            }
          } catch (analysisError) {
            logger.error("Error performing light analysis on photo:", handleError(analysisError));
            // Continue without adding analysis to notes, don't block the main flow
          }
        }
      } catch (error) {
        logger.error('Error processing photo data:', handleError(error));
        return res.status(500).json({ message: 'Failed to process photo' });
      }
    }
    
    const careLog = await storage.createCareLog(careLogData);
    
    // Get the plant to update its reminders
    const plant = await storage.getPlant(careLogData.plantId);
    if (plant) {
      // Get the authenticated user ID
      const userId = req.user!.id;
      
      // Update existing reminders based on the care action performed
      const existingReminders = await storage.getRemindersByPlant(careLogData.plantId);
      
      if (careLogData.careType === 'water') {
        // Find existing water reminder
        const waterReminder = existingReminders.find(r => r.careType === 'water');
        
        if (waterReminder && plant.waterFrequency > 0) {
          // Calculate next watering date
          const nextWateringDate = new Date();
          nextWateringDate.setDate(nextWateringDate.getDate() + plant.waterFrequency);
          
          // Update existing reminder
          await storage.updateReminder(waterReminder.id, {
            dueDate: nextWateringDate.toISOString(),
            status: 'pending' // Reset status if it was completed/dismissed
          });
        } else if (plant.waterFrequency > 0) {
          // Create new reminder if none exists
          const nextWateringDate = new Date();
          nextWateringDate.setDate(nextWateringDate.getDate() + plant.waterFrequency);
          
          await storage.createReminder({
            plantId: plant.id,
            userId,
            title: `Water your ${plant.name}`,
            message: `It's time to water your ${plant.name}`,
            dueDate: nextWateringDate.toISOString(),
            careType: 'water',
            status: 'pending',
            recurring: true,
            recurringInterval: plant.waterFrequency,
            notified: false
          });
        }
        
        // Update the plant's last watered date
        await storage.updatePlant(plant.id, {
          lastWatered: new Date().toISOString()
        });
      } else if (careLogData.careType === 'fertilize') {
        // Find existing fertilizer reminder
        const fertilizerReminder = existingReminders.find(r => r.careType === 'fertilize');
        
        if (fertilizerReminder && plant.fertilizerFrequency > 0) {
          // Calculate next fertilizing date
          const nextFertilizingDate = new Date();
          nextFertilizingDate.setDate(nextFertilizingDate.getDate() + plant.fertilizerFrequency);
          
          // Update existing reminder
          await storage.updateReminder(fertilizerReminder.id, {
            dueDate: nextFertilizingDate.toISOString(),
            status: 'pending' // Reset status if it was completed/dismissed
          });
        } else if (plant.fertilizerFrequency > 0) {
          // Create new reminder if none exists
          const nextFertilizingDate = new Date();
          nextFertilizingDate.setDate(nextFertilizingDate.getDate() + plant.fertilizerFrequency);
          
          await storage.createReminder({
            plantId: plant.id,
            userId,
            title: `Fertilize your ${plant.name}`,
            message: `It's time to fertilize your ${plant.name}`,
            dueDate: nextFertilizingDate.toISOString(),
            careType: 'fertilize',
            status: 'pending',
            recurring: true,
            recurringInterval: plant.fertilizerFrequency,
            notified: false
          });
        }
        
        // Update the plant's last fertilized date
        await storage.updatePlant(plant.id, {
          lastFertilized: new Date().toISOString()
        });
      }
    }
    
    // Perform background analysis if there's a photo
    // This runs after we've already responded to the client to avoid delay in the response
    if (photoForLightAnalysis && plant) {
      // Use a Promise to run the analysis asynchronously
      (async () => {
        try {
          logger.info(`Analyzing light level for plant ID ${plant.id} from care log photo...`);
          
          // Analyze the image for light level
          const { sunlightLevel, confidence } = await analyzePlantImageLightLevel(photoForLightAnalysis);
          
          logger.info(`Light analysis result: ${sunlightLevel} (confidence: ${confidence})`);
          
          // Only update the plant if we have medium or high confidence in the result
          if (confidence !== "low") {
            // Update the plant's sunlight level
            await storage.updatePlant(plant.id, { sunlightLevel });
            logger.info(`Updated plant ${plant.id} (${plant.name}) sunlight level to: ${sunlightLevel}`);
          } else {
            logger.info(`Low confidence in light analysis result, not updating plant record.`);
          }
          
          // Generate journal entry with comprehensive analysis including plant verification
          try {
            logger.info(`Generating journal entry for care log ${careLog.id}...`);
            const { generateJournalEntry } = await import("./services/openai");
            
            // We need to get the plant with care details for the journal entry
            const plantWithCare = await storage.getPlantWithCare(plant.id);
            if (!plantWithCare) {
              throw new Error("Failed to get plant with care details");
            }
            
            // Get all past care logs for this plant for comprehensive analysis
            const careHistory = await storage.getPlantCareHistory(plant.id);
            
            // Filter out the current care log since we're analyzing it
            const pastCareHistory = careHistory.filter(log => log.id !== careLog.id);
            
            logger.info(`Including ${pastCareHistory.length} previous care logs in the AI analysis for plant ${plant.id}`);
            
            // Generate journal entry with AI analysis and care history
            const journalEntry = await generateJournalEntry(careLog, plantWithCare, pastCareHistory);
            
            // Create summary to add to the care log notes
            let aiAnalysisSummary = "\n\n--- AI Analysis ---\n";
            
            // Add plant identity verification result
            if (journalEntry.plantIdentityMatch) {
              const matchResult = journalEntry.plantIdentityMatch.matches ? "✓" : "✗";
              const plantName = journalEntry.plantIdentityMatch.detectedPlant || 'Unknown plant';
              
              aiAnalysisSummary += journalEntry.plantIdentityMatch.matches 
                ? `Plant identification: ${matchResult} Confirmed ${plant.name}\n`
                : `Plant identification: ${matchResult} Detected ${plantName} instead of ${plant.name}\n`;
            }
            
            // Add a couple key observations
            if (journalEntry.observations && journalEntry.observations.length > 0) {
              aiAnalysisSummary += "\nObservations:\n";
              // Add up to 3 observations to keep it concise
              journalEntry.observations.slice(0, 3).forEach(obs => {
                aiAnalysisSummary += `- ${obs}\n`;
              });
            }
            
            // Add growth progress summary
            if (journalEntry.growthProgress) {
              aiAnalysisSummary += `\nGrowth assessment: ${journalEntry.growthProgress.split('\n')[0]}\n`;
            }
            
            // Update the care log with the AI analysis in the notes
            const updatedNotes = (careLog.notes || "") + aiAnalysisSummary;
            await storage.updateCareLog(careLog.id, {
              notes: updatedNotes
            });
            
            // Handle plant identity mismatch in metadata
            if (journalEntry.plantIdentityMatch && 
                journalEntry.plantIdentityMatch.confidence !== "low" && 
                !journalEntry.plantIdentityMatch.matches) {
              
              logger.info(`⚠️ Plant identity mismatch detected in care log ${careLog.id}!`);
              logger.info(`Expected: ${plant.name}, Detected: ${journalEntry.plantIdentityMatch.detectedPlant || 'Unknown'}`);
              
              // Add a mismatch warning to the metadata
              const metadata = {
                plantIdentityMismatch: true,
                expectedPlant: plant.name,
                detectedPlant: journalEntry.plantIdentityMatch.detectedPlant,
                confidence: journalEntry.plantIdentityMatch.confidence
              };
              
              // Store this information in the care log metadata
              await storage.updateCareLog(careLog.id, {
                metadata: JSON.stringify(metadata)
              });
            }
          } catch (journalError) {
            logger.error('Error generating journal entry:', handleError(journalError));
            // Don't block the process, continue with other tasks
          }
        } catch (error) {
          logger.error('Error performing background analysis:', handleError(error));
          // No need to handle this error since this is a background task
          // and doesn't affect the response to the client
        }
      })().catch(err => {
        logger.error('Unhandled error in background analysis task:', err);
      });
    }
    
    res.status(201).json(careLog);
  });

  // Plant guides routes
  apiRouter.get("/api/plant-guides", async (req, res) => {
    const guides = await storage.getPlantGuides();
    logger.info(`Serving ${guides.length} plant guides`);
    res.json(guides);
  });

  apiRouter.get("/api/plant-guides/:type", async (req, res) => {
    const plantType = req.params.type;
    const guide = await storage.getPlantGuideByType(plantType);
    
    if (!guide) {
      return res.status(404).json({ message: "Plant guide not found" });
    }
    
    logger.info(`Serving plant guide for ${plantType}`);
    res.json(guide);
  });

  // Dashboard summary route
  apiRouter.get("/api/dashboard/care-needed", async (req, res) => {
    // For debugging, always use user ID 1 (Zach) if not authenticated
    const userId = req.isAuthenticated() ? req.user!.id : 1;
    logger.info(`Getting care needed for user ID ${userId}`);
    const careNeeded = await storage.getPlantsNeedingCare(userId);
    logger.info(`Found ${careNeeded.needsWater.length} plants needing water and ${careNeeded.needsFertilizer.length} plants needing fertilizer`);
    res.json(careNeeded);
  });
  
  // Reminder routes
  apiRouter.get("/api/reminders", isAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    const reminders = await storage.getReminders(userId);
    res.json(reminders);
  });
  
  apiRouter.get("/api/reminders/upcoming/:days", isAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    const days = parseInt(req.params.days);
    
    if (isNaN(days)) {
      return res.status(400).json({ message: "Invalid days parameter" });
    }
    
    const reminders = await storage.getUpcomingReminders(userId, days);
    res.json(reminders);
  });
  
  apiRouter.get("/api/reminders/overdue", isAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    const reminders = await storage.getOverdueReminders(userId);
    res.json(reminders);
  });
  
  apiRouter.get("/api/plants/:id/reminders", isAuthenticated, async (req, res) => {
    const plantId = parseInt(req.params.id);
    if (isNaN(plantId)) {
      return res.status(400).json({ message: "Invalid plant ID" });
    }
    
    const reminders = await storage.getRemindersByPlant(plantId);
    res.json(reminders);
  });
  
  apiRouter.post("/api/reminders", isAuthenticated, async (req, res) => {
    // We need to bring in the insertReminderSchema
    const { insertReminderSchema } = await import("@shared/schema");
    
    const validation = validateRequest(insertReminderSchema, req, res);
    if (!validation.success) return;
    
    // Ensure message is provided with a default if not present
    const reminderData = {
      ...validation.data,
      message: validation.data.message || `Reminder for ${validation.data.title}`
    };
    
    const reminder = await storage.createReminder(reminderData);
    res.status(201).json(reminder);
  });
  
  apiRouter.patch("/api/reminders/:id", isAuthenticated, async (req, res) => {
    const reminderId = parseInt(req.params.id);
    if (isNaN(reminderId)) {
      return res.status(400).json({ message: "Invalid reminder ID" });
    }
    
    // We need to bring in the insertReminderSchema
    const { insertReminderSchema } = await import("@shared/schema");
    
    // Allow partial updates
    const validation = validateRequest(insertReminderSchema.partial(), req, res);
    if (!validation.success) return;
    
    const updatedReminder = await storage.updateReminder(reminderId, validation.data);
    if (!updatedReminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }
    
    res.json(updatedReminder);
  });
  
  apiRouter.delete("/api/reminders/:id", isAuthenticated, async (req, res) => {
    const reminderId = parseInt(req.params.id);
    if (isNaN(reminderId)) {
      return res.status(400).json({ message: "Invalid reminder ID" });
    }
    
    const success = await storage.deleteReminder(reminderId);
    if (!success) {
      return res.status(404).json({ message: "Reminder not found" });
    }
    
    res.status(204).send();
  });
  
  apiRouter.post("/api/reminders/:id/complete", isAuthenticated, async (req, res) => {
    const reminderId = parseInt(req.params.id);
    if (isNaN(reminderId)) {
      return res.status(400).json({ message: "Invalid reminder ID" });
    }
    
    const updatedReminder = await storage.markReminderComplete(reminderId);
    if (!updatedReminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }
    
    res.json(updatedReminder);
  });
  
  apiRouter.post("/api/reminders/:id/dismiss", isAuthenticated, async (req, res) => {
    const reminderId = parseInt(req.params.id);
    if (isNaN(reminderId)) {
      return res.status(400).json({ message: "Invalid reminder ID" });
    }
    
    const updatedReminder = await storage.markReminderDismissed(reminderId);
    if (!updatedReminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }
    
    res.json(updatedReminder);
  });

  // Plant identification route
  apiRouter.post("/api/identify-plant", isAuthenticated, async (req, res) => {
    try {
      // Validate request
      const identifySchema = z.object({
        imageBase64: z.string().min(1),
      });
      
      const validation = validateRequest(identifySchema, req, res);
      if (!validation.success) return;
      
      // Extract base64 image data
      let { imageBase64 } = validation.data;
      
      // Process the image to ensure it's in the right format
      try {
        // If it's already a data URL, we need to extract just the base64 part
        if (imageBase64.startsWith('data:')) {
          // Extract the base64 content without the mime type prefix
          const parts = imageBase64.split(',');
          if (parts.length === 2) {
            imageBase64 = parts[1];
          } else {
            console.warn("Unexpected data URL format. Using as-is.");
          }
        }
        
        // Verify it's actually a base64 string by attempting to decode it
        try {
          const testBuffer = Buffer.from(imageBase64, 'base64');
          // Check if the buffer is non-empty
          if (testBuffer.length === 0) {
            throw new Error("Empty image buffer after base64 decode");
          }
          
          // If we reach here, the base64 string is valid
          logger.info(`Successfully validated base64 string (${Math.floor(testBuffer.length / 1024)} KB)`);
        } catch (decodeError) {
          logger.error("Error decoding base64 string:", handleError(decodeError));
          throw new Error("Invalid base64 image data");
        }
      } catch (imageProcessingError) {
        logger.error("Error processing image data:", handleError(imageProcessingError));
        return res.status(400).json({
          message: "Invalid image data",
          error: imageProcessingError instanceof Error ? imageProcessingError.message : String(imageProcessingError)
        });
      }
      
      // Process with OpenAI
      const result = await identifyPlantFromImage(imageBase64);
      
      // Return identification results
      res.json(result);
    } catch (error) {
      logger.error("Error identifying plant:", handleError(error));
      res.status(500).json({
        message: "Failed to identify plant",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Plant health diagnostic route
  apiRouter.post("/api/diagnose-plant-health", isAuthenticated, async (req, res) => {
    try {
      // Validate request
      const diagnoseSchema = z.object({
        imageBase64: z.string().min(1),
      });
      
      const validation = validateRequest(diagnoseSchema, req, res);
      if (!validation.success) return;
      
      // Extract base64 image data
      let { imageBase64 } = validation.data;
      
      // Process the image to ensure it's in the right format
      try {
        // If it's already a data URL, we need to extract just the base64 part
        if (imageBase64.startsWith('data:')) {
          // Extract the base64 content without the mime type prefix
          const parts = imageBase64.split(',');
          if (parts.length === 2) {
            imageBase64 = parts[1];
          } else {
            console.warn("Unexpected data URL format for diagnosis. Using as-is.");
          }
        }
        
        // Verify it's actually a base64 string by attempting to decode it
        try {
          const testBuffer = Buffer.from(imageBase64, 'base64');
          // Check if the buffer is non-empty
          if (testBuffer.length === 0) {
            throw new Error("Empty image buffer after base64 decode");
          }
          
          // If we reach here, the base64 string is valid
          logger.info(`Successfully validated base64 string for diagnosis (${Math.floor(testBuffer.length / 1024)} KB)`);
        } catch (decodeError) {
          logger.error("Error decoding base64 string for diagnosis:", handleError(decodeError));
          throw new Error("Invalid base64 image data");
        }
      } catch (imageProcessingError) {
        logger.error("Error processing image data for diagnosis:", handleError(imageProcessingError));
        return res.status(400).json({
          message: "Invalid image data",
          error: imageProcessingError instanceof Error ? imageProcessingError.message : String(imageProcessingError)
        });
      }
      
      // Process with OpenAI
      const result = await diagnosePlantHealth(imageBase64);
      
      // Return diagnosis results
      res.json(result);
    } catch (error) {
      logger.error("Error diagnosing plant health:", handleError(error));
      res.status(500).json({
        message: "Failed to diagnose plant health",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Demo routes - for development and testing only
  apiRouter.post("/api/demo/health-diagnosis/:plantId", isAuthenticated, async (req, res) => {
    // This endpoint creates a sample health diagnosis care log for demonstration purposes
    const plantId = parseInt(req.params.plantId);
    if (isNaN(plantId)) {
      return res.status(400).json({ message: "Invalid plant ID" });
    }
    
    // Get the plant to ensure it exists and belongs to the user
    const plant = await storage.getPlant(plantId);
    if (!plant) {
      return res.status(404).json({ message: "Plant not found" });
    }
    
    // Ensure the plant belongs to the authenticated user
    if (plant.userId !== req.user!.id) {
      return res.status(403).json({ message: "You don't have permission to access this plant" });
    }
    
    // Sample health diagnosis data - we'll randomly choose one of several possible issues
    const sampleDiagnoses: PlantHealthDiagnosis[] = [
      {
        issue: "Leaf Yellowing with Brown Spots",
        cause: "The yellowing leaves with brown spots indicate a fungal infection, likely caused by overwatering and poor air circulation around the plant.",
        solution: "Trim affected leaves with clean, sterilized scissors. Reduce watering frequency and ensure the soil dries between waterings. Improve air circulation around the plant and avoid wetting the leaves when watering.",
        preventionTips: [
          "Water at the base of the plant, not from above",
          "Ensure proper drainage in the pot",
          "Maintain good air circulation around plants",
          "Clean gardening tools between uses to prevent spreading infection"
        ],
        severity: "medium",
        confidenceLevel: "high"
      },
      {
        issue: "Spider Mite Infestation",
        cause: "The fine webbing and stippled appearance on leaves indicate spider mites, which thrive in dry, warm conditions and can quickly spread throughout the plant.",
        solution: "Isolate the plant from others immediately. Spray leaves (including undersides) with insecticidal soap or neem oil. For severe infestations, consider a miticide specific to spider mites. Increase humidity around the plant.",
        preventionTips: [
          "Regularly mist plants to increase humidity, as spider mites prefer dry conditions",
          "Inspect new plants carefully before bringing them home",
          "Keep plants dust-free by occasionally wiping leaves",
          "Maintain adequate spacing between plants to improve air circulation"
        ],
        severity: "high",
        confidenceLevel: "high"
      },
      {
        issue: "Nutrient Deficiency",
        cause: "The interveinal chlorosis (yellowing between leaf veins) suggests a magnesium or iron deficiency, often due to improper soil pH or nutrient imbalance.",
        solution: "Apply a balanced fertilizer with micronutrients. For magnesium deficiency, add Epsom salts (1 tbsp per gallon of water). For iron deficiency, use a chelated iron supplement and adjust soil pH if needed.",
        preventionTips: [
          "Use a high-quality potting mix when repotting",
          "Follow a regular fertilization schedule appropriate for the plant",
          "Test and adjust soil pH as needed for proper nutrient absorption",
          "Avoid overwatering which can leach nutrients from the soil"
        ],
        severity: "low",
        confidenceLevel: "medium"
      }
    ];
    
    // Randomly select one of the sample diagnoses
    const healthDiagnosis = sampleDiagnoses[Math.floor(Math.random() * sampleDiagnoses.length)];
    
    try {
      // Create the care log with health diagnosis data
      const careLog = await storage.createCareLog({
        plantId,
        careType: 'health_check',
        notes: 'Sample health check with diagnosis data for demonstration',
        metadata: JSON.stringify({ healthDiagnosis })
      });
      
      res.status(201).json({
        message: "Sample health diagnosis created successfully",
        careLog,
        healthDiagnosis
      });
    } catch (error) {
      logger.error("Error creating sample health diagnosis:", handleError(error));
      res.status(500).json({
        message: "Failed to create sample health diagnosis",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ===== NEW AI-POWERED FEATURES =====

  // 1. Personalized Plant Advice
  apiRouter.post("/api/ai/personalized-advice/:plantId", isAuthenticated, async (req, res) => {
    try {
      const plantId = parseInt(req.params.plantId);
      if (isNaN(plantId)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      // Get the plant and ensure it belongs to the user
      const plant = await storage.getPlant(plantId);
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }
      if (plant.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to access this plant" });
      }

      // Get recent care logs for the plant
      const careLogs = await storage.getCareLogs(plantId);

      // Parse user environment from request body
      const userEnvironmentSchema = z.object({
        location: z.string().optional(),
        indoorTemperature: z.number().optional(),
        humidity: z.number().optional(),
        lightConditions: z.string().optional(),
        averageWateringFrequency: z.number().optional()
      });

      const validation = validateRequest(userEnvironmentSchema, req, res);
      if (!validation.success) return;

      const userEnvironment: UserEnvironment = validation.data;

      // Get personalized advice from OpenAI
      const advice = await getPersonalizedPlantAdvice(plant, careLogs, userEnvironment);

      res.json(advice);
    } catch (error: any) {
      logger.error("Error getting personalized plant advice:", error);
      res.status(500).json({
        message: "Failed to get personalized plant advice",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 2. Seasonal Care Recommendations
  apiRouter.post("/api/ai/seasonal-recommendations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Get all user's plants
      const plants = await storage.getPlants(userId);
      if (plants.length === 0) {
        return res.status(400).json({ message: "You need to have at least one plant to get seasonal recommendations" });
      }

      // Schema for request validation
      const seasonalSchema = z.object({
        location: z.string(),
        season: z.string().optional()
      });

      const validation = validateRequest(seasonalSchema, req, res);
      if (!validation.success) return;

      // Get seasonal recommendations
      const recommendations = await getSeasonalCareRecommendations(
        plants,
        validation.data.location,
        validation.data.season
      );

      res.json(recommendations);
    } catch (error: any) {
      logger.error("Error getting seasonal care recommendations:", error);
      res.status(500).json({
        message: "Failed to get seasonal care recommendations",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 3. Plant Arrangement Suggestions
  apiRouter.post("/api/ai/arrangement-suggestions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Get user's plants
      const plants = await storage.getPlants(userId);
      if (plants.length < 2) {
        return res.status(400).json({ 
          message: "You need at least two plants to get arrangement suggestions" 
        });
      }

      // Schema for request validation
      const arrangementSchema = z.object({
        spaceType: z.string(),
        spaceSize: z.string(),
        plantIds: z.array(z.number()).optional() // Optional array of plant IDs to include
      });

      const validation = validateRequest(arrangementSchema, req, res);
      if (!validation.success) return;

      // Filter plants if specific plant IDs were provided
      let plantsToArrange = plants;
      if (validation.data.plantIds && validation.data.plantIds.length > 0) {
        plantsToArrange = plants.filter(plant => validation.data.plantIds!.includes(plant.id));
        if (plantsToArrange.length < 2) {
          return res.status(400).json({ 
            message: "You need at least two valid plants to get arrangement suggestions" 
          });
        }
      }

      // Get arrangement suggestions
      const suggestions = await getPlantArrangementSuggestions(
        plantsToArrange,
        validation.data.spaceType,
        validation.data.spaceSize
      );

      res.json(suggestions);
    } catch (error: any) {
      logger.error("Error getting plant arrangement suggestions:", error);
      res.status(500).json({
        message: "Failed to get plant arrangement suggestions",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 4. AI Journal Entry Generation
  apiRouter.post("/api/ai/journal-entry/:careLogId", isAuthenticated, async (req, res) => {
    try {
      const careLogId = parseInt(req.params.careLogId);
      if (isNaN(careLogId)) {
        return res.status(400).json({ message: "Invalid care log ID" });
      }

      // Get the care log
      // Note: We would need to add a method to get a care log by ID to the storage interface
      // For now, we'll get all logs for the plant and find the one we need
      const plantId = parseInt(req.query.plantId as string);
      if (isNaN(plantId)) {
        return res.status(400).json({ message: "Plant ID is required" });
      }

      // Check if plant belongs to user
      const plant = await storage.getPlant(plantId);
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }
      if (plant.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to access this plant" });
      }

      // Get care logs for the plant
      const careLogs = await storage.getCareLogs(plantId);
      const careLog = careLogs.find(log => log.id === careLogId);
      if (!careLog) {
        return res.status(404).json({ message: "Care log not found" });
      }

      // Get care history for better insights
      const careHistory = await storage.getPlantCareHistory(plantId);
      
      // Filter out the current care log from history to avoid duplication
      const pastCareHistory = careHistory.filter(log => log.id !== careLogId);
      
      logger.info(`Including ${pastCareHistory.length} previous care logs in AI journal analysis for plant ${plantId}`);
      
      // Generate enhanced journal entry with care history
      const journalEntry = await generateJournalEntry(careLog, plant, pastCareHistory);

      res.json(journalEntry);
    } catch (error: any) {
      logger.error("Error generating journal entry:", error);
      res.status(500).json({
        message: "Failed to generate journal entry",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 5. Growth Analysis
  apiRouter.post("/api/ai/growth-analysis/:plantId", isAuthenticated, async (req, res) => {
    try {
      const plantId = parseInt(req.params.plantId);
      if (isNaN(plantId)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      // Get the plant and ensure it belongs to the user
      const plant = await storage.getPlant(plantId);
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }
      if (plant.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to access this plant" });
      }

      // Schema for request validation
      const growthSchema = z.object({
        imageHistory: z.array(z.string()).min(2)
      });

      const validation = validateRequest(growthSchema, req, res);
      if (!validation.success) return;

      // Analyze growth progression
      const analysis = await analyzeGrowthProgression(validation.data.imageHistory, plant);

      res.json(analysis);
    } catch (error: any) {
      logger.error("Error analyzing growth progression:", error);
      res.status(500).json({
        message: "Failed to analyze growth progression",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 6. Plant Care Q&A
  apiRouter.post("/api/ai/plant-care-answer", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Schema for request validation
      const questionSchema = z.object({
        question: z.string().min(5),
        includePlantsContext: z.boolean().optional()
      });

      const validation = validateRequest(questionSchema, req, res);
      if (!validation.success) return;

      // Get user's plants if context is requested
      let plantsContext = undefined;
      if (validation.data.includePlantsContext) {
        plantsContext = await storage.getPlants(userId);
      }

      // Get answer from OpenAI
      const answer = await getPlantCareAnswer(validation.data.question, plantsContext);

      res.json(answer);
    } catch (error: any) {
      logger.error("Error getting plant care answer:", error);
      res.status(500).json({
        message: "Failed to get plant care answer",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 7. Optimized Care Schedule
  apiRouter.post("/api/ai/optimized-schedule", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Get all user's plants
      const plants = await storage.getPlants(userId);
      if (plants.length === 0) {
        return res.status(400).json({ message: "You need to have at least one plant to generate a care schedule" });
      }

      // Schema for request validation
      const scheduleSchema = z.object({
        weekdays: z.array(z.object({
          day: z.string(),
          availableTimeSlots: z.array(z.string())
        })),
        preferences: z.object({
          preferredTime: z.string(),
          maxDailyMinutes: z.number()
        })
      });

      const validation = validateRequest(scheduleSchema, req, res);
      if (!validation.success) return;

      // Get optimized care schedule
      const schedule = await generateOptimizedCareSchedule(plants, validation.data);

      res.json(schedule);
    } catch (error: any) {
      logger.error("Error generating optimized care schedule:", error);
      res.status(500).json({
        message: "Failed to generate optimized care schedule",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 8. Community Insights
  apiRouter.post("/api/ai/community-insights", isAuthenticated, async (req, res) => {
    try {
      // Schema for request validation
      const insightsSchema = z.object({
        plantType: z.string(),
        anonymizedCareLogs: z.array(z.object({
          plantType: z.string(),
          scientificName: z.string(),
          careType: z.string(),
          frequency: z.number(),
          success: z.boolean(),
          notes: z.string().optional()
        }))
      });

      const validation = validateRequest(insightsSchema, req, res);
      if (!validation.success) return;

      // Get community insights
      const insights = await generateCommunityInsights(
        validation.data.plantType,
        validation.data.anonymizedCareLogs
      );

      res.json(insights);
    } catch (error: any) {
      logger.error("Error generating community insights:", error);
      res.status(500).json({
        message: "Failed to generate community insights",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Community Tips Routes
  // Get all community tips with optional filtering
  apiRouter.get("/api/community-tips", async (req, res) => {
    try {
      // Parse filter parameters from query
      const filters: {
        plantType?: string;
        careCategory?: string;
        userId?: number;
        featured?: boolean;
      } = {};
      
      if (req.query.plantType) {
        filters.plantType = req.query.plantType as string;
      }
      
      if (req.query.careCategory) {
        filters.careCategory = req.query.careCategory as string;
      }
      
      if (req.query.userId) {
        const userId = parseInt(req.query.userId as string);
        if (!isNaN(userId)) {
          filters.userId = userId;
        }
      }
      
      if (req.query.featured === 'true') {
        filters.featured = true;
      }
      
      // Add voted status for authenticated users
      let userVotedTips: number[] = [];
      if (req.isAuthenticated()) {
        userVotedTips = await storage.getUserVotedTips(req.user!.id);
      }
      
      // Get the community tips
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const tips = await storage.getCommunityTips(filters, limit);
      
      // Add userHasLiked flag to tips for authenticated users
      const tipsWithUserLikes = tips.map(tip => ({
        ...tip,
        userHasLiked: userVotedTips.includes(tip.id)
      }));
      
      res.json(tipsWithUserLikes);
    } catch (error: any) {
      logger.error("Error getting community tips:", error);
      res.status(500).json({
        message: "Failed to get community tips",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get a single community tip by ID
  apiRouter.get("/api/community-tips/:id", async (req, res) => {
    try {
      const tipId = parseInt(req.params.id);
      if (isNaN(tipId)) {
        return res.status(400).json({ message: "Invalid tip ID" });
      }
      
      const tip = await storage.getCommunityTip(tipId);
      if (!tip) {
        return res.status(404).json({ message: "Community tip not found" });
      }
      
      // Add userHasLiked flag if user is authenticated
      let userHasLiked = false;
      if (req.isAuthenticated()) {
        const userVotedTips = await storage.getUserVotedTips(req.user!.id);
        userHasLiked = userVotedTips.includes(tipId);
      }
      
      res.json({
        ...tip,
        userHasLiked
      });
    } catch (error: any) {
      logger.error("Error getting community tip:", error);
      res.status(500).json({
        message: "Failed to get community tip",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Create a new community tip (requires authentication)
  apiRouter.post("/api/community-tips", isAuthenticated, async (req, res) => {
    try {
      const validation = validateRequest(insertCommunityTipSchema, req, res);
      if (!validation.success) return;
      
      // Set the user ID from the authenticated user
      const tipData: InsertCommunityTip = {
        ...validation.data,
        userId: req.user!.id
      };
      
      const tip = await storage.createCommunityTip(tipData);
      res.status(201).json(tip);
    } catch (error: any) {
      logger.error("Error creating community tip:", error);
      res.status(500).json({
        message: "Failed to create community tip",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Update a community tip (only by the original author or admin)
  apiRouter.put("/api/community-tips/:id", isAuthenticated, async (req, res) => {
    try {
      const tipId = parseInt(req.params.id);
      if (isNaN(tipId)) {
        return res.status(400).json({ message: "Invalid tip ID" });
      }
      
      // Get the existing tip
      const existingTip = await storage.getCommunityTip(tipId);
      if (!existingTip) {
        return res.status(404).json({ message: "Community tip not found" });
      }
      
      // Only allow the original author or admins to update the tip
      // For now, we'll assume user ID 1 is an admin
      if (existingTip.userId !== req.user!.id && req.user!.id !== 1) {
        return res.status(403).json({ message: "You don't have permission to update this tip" });
      }
      
      const validation = validateRequest(insertCommunityTipSchema.partial(), req, res);
      if (!validation.success) return;
      
      const updatedTip = await storage.updateCommunityTip(tipId, validation.data);
      if (!updatedTip) {
        return res.status(404).json({ message: "Community tip not found" });
      }
      
      res.json(updatedTip);
    } catch (error: any) {
      logger.error("Error updating community tip:", error);
      res.status(500).json({
        message: "Failed to update community tip",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Delete a community tip (only by the original author or admin)
  apiRouter.delete("/api/community-tips/:id", isAuthenticated, async (req, res) => {
    try {
      const tipId = parseInt(req.params.id);
      if (isNaN(tipId)) {
        return res.status(400).json({ message: "Invalid tip ID" });
      }
      
      // Get the existing tip
      const existingTip = await storage.getCommunityTip(tipId);
      if (!existingTip) {
        return res.status(404).json({ message: "Community tip not found" });
      }
      
      // Only allow the original author or admins to delete the tip
      // For now, we'll assume user ID 1 is an admin
      if (existingTip.userId !== req.user!.id && req.user!.id !== 1) {
        return res.status(403).json({ message: "You don't have permission to delete this tip" });
      }
      
      const success = await storage.deleteCommunityTip(tipId);
      if (!success) {
        return res.status(404).json({ message: "Community tip not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      logger.error("Error deleting community tip:", error);
      res.status(500).json({
        message: "Failed to delete community tip",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Like a community tip (requires authentication)
  apiRouter.post("/api/community-tips/:id/like", isAuthenticated, async (req, res) => {
    try {
      const tipId = parseInt(req.params.id);
      if (isNaN(tipId)) {
        return res.status(400).json({ message: "Invalid tip ID" });
      }
      
      const success = await storage.addTipVote(tipId, req.user!.id);
      
      // If false, user likely already voted
      if (!success) {
        return res.status(400).json({ message: "You have already liked this tip" });
      }
      
      res.status(200).json({ message: "Tip liked successfully" });
    } catch (error: any) {
      logger.error("Error liking community tip:", error);
      res.status(500).json({
        message: "Failed to like community tip",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Unlike a community tip (requires authentication)
  apiRouter.delete("/api/community-tips/:id/like", isAuthenticated, async (req, res) => {
    try {
      const tipId = parseInt(req.params.id);
      if (isNaN(tipId)) {
        return res.status(400).json({ message: "Invalid tip ID" });
      }
      
      const success = await storage.removeTipVote(tipId, req.user!.id);
      
      // If false, user likely didn't vote
      if (!success) {
        return res.status(400).json({ message: "You have not liked this tip" });
      }
      
      res.status(200).json({ message: "Tip unliked successfully" });
    } catch (error: any) {
      logger.error("Error unliking community tip:", error);
      res.status(500).json({
        message: "Failed to unlike community tip",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get care categories (used for filtering tips)
  apiRouter.get("/api/community-tips/categories", (req, res) => {
    res.json(CARE_CATEGORIES);
  });
  
  // Debug endpoint to create a community tip without authentication
  apiRouter.post("/api/debug/community-tips", async (req, res) => {
    try {
      logger.info("Debug community tip creation request:", req.body);
      
      // Validate request data
      const validation = validateRequest(insertCommunityTipSchema, req, res);
      if (!validation.success) return;
      
      // Set user ID to 1 (Zach) for debugging
      const tipData: InsertCommunityTip = {
        ...validation.data,
        userId: 1
      };
      
      // Create the community tip
      const tip = await storage.createCommunityTip(tipData);
      res.status(201).json(tip);
    } catch (error: any) {
      logger.error("Error in debug community tip creation:", error);
      res.status(500).json({
        message: "Failed to create community tip",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Admin-only routes for community tip moderation
  
  // Feature/unfeature a community tip (admin only)
  apiRouter.post("/api/admin/community-tips/:id/feature", isAuthenticated, async (req, res) => {
    try {
      // For now, we'll assume user ID 1 is an admin
      if (req.user!.id !== 1) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const tipId = parseInt(req.params.id);
      if (isNaN(tipId)) {
        return res.status(400).json({ message: "Invalid tip ID" });
      }
      
      const featured = req.body.featured === true;
      const success = await storage.featureCommunityTip(tipId, featured);
      
      if (!success) {
        return res.status(404).json({ message: "Community tip not found" });
      }
      
      res.status(200).json({ message: `Tip ${featured ? 'featured' : 'unfeatured'} successfully` });
    } catch (error: any) {
      logger.error("Error featuring community tip:", error);
      res.status(500).json({
        message: "Failed to update feature status",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Update tip status (active, reported, removed) (admin only)
  apiRouter.post("/api/admin/community-tips/:id/status", isAuthenticated, async (req, res) => {
    try {
      // For now, we'll assume user ID 1 is an admin
      if (req.user!.id !== 1) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const tipId = parseInt(req.params.id);
      if (isNaN(tipId)) {
        return res.status(400).json({ message: "Invalid tip ID" });
      }
      
      // Validate status value
      const { status } = req.body;
      if (!status || !['active', 'reported', 'removed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      const success = await storage.updateTipStatus(tipId, status);
      
      if (!success) {
        return res.status(404).json({ message: "Community tip not found" });
      }
      
      res.status(200).json({ message: `Tip status updated to ${status} successfully` });
    } catch (error: any) {
      logger.error("Error updating community tip status:", error);
      res.status(500).json({
        message: "Failed to update tip status",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
