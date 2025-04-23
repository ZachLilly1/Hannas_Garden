import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertPlantSchema, 
  insertCareLogSchema,
  type InsertPlant,
  type InsertCareLog
} from "@shared/schema";
import { z } from "zod";
import { identifyPlantFromImage, type PlantIdentificationResult } from "./services/openai";
import fs from "fs";
import path from "path";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // API routes
  const apiRouter = app;

  // Helper function to validate request body
  function validateRequest<T>(
    schema: z.ZodType<T>,
    req: Request,
    res: Response
  ): { success: true; data: T } | { success: false } {
    try {
      const data = schema.parse(req.body);
      return { success: true, data };
    } catch (error) {
      res.status(400).json({ message: "Invalid request data", error });
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
  
  apiRouter.patch("/api/auth/profile", isAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    const { displayName, email, preferredUnits, timezone, notificationsEnabled } = req.body;
    
    // Only allow these fields to be updated
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (email !== undefined) updateData.email = email;
    if (preferredUnits !== undefined) updateData.preferredUnits = preferredUnits;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;
    
    try {
      const updatedUser = await storage.updateUserProfile(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating profile:", error);
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
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password", error: error.message });
    }
  });
  
  // Plant routes
  apiRouter.get("/api/plants", isAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    const plants = await storage.getPlants(userId);
    res.json(plants);
  });

  apiRouter.get("/api/plants/:id", isAuthenticated, async (req, res) => {
    const plantId = parseInt(req.params.id);
    if (isNaN(plantId)) {
      return res.status(400).json({ message: "Invalid plant ID" });
    }
    
    const plant = await storage.getPlant(plantId);
    if (!plant) {
      return res.status(404).json({ message: "Plant not found" });
    }
    
    // Ensure the plant belongs to the authenticated user
    if (plant.userId !== req.user!.id) {
      return res.status(403).json({ message: "You don't have permission to access this plant" });
    }
    
    res.json(plant);
  });

  apiRouter.post("/api/plants", isAuthenticated, async (req, res) => {
    const validation = validateRequest(insertPlantSchema, req, res);
    if (!validation.success) return;
    
    const userId = req.user!.id;
    const plantData: InsertPlant = {
      ...validation.data,
      userId
    };
    
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
    
    // For demo, use a fixed userId=1
    const userId = 1;
    
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

  apiRouter.delete("/api/plants/:id", async (req, res) => {
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

  // Care log routes
  apiRouter.get("/api/plants/:id/care-logs", async (req, res) => {
    const plantId = parseInt(req.params.id);
    if (isNaN(plantId)) {
      return res.status(400).json({ message: "Invalid plant ID" });
    }
    
    const logs = await storage.getCareLogs(plantId);
    res.json(logs);
  });

  apiRouter.post("/api/care-logs", async (req, res) => {
    const validation = validateRequest(insertCareLogSchema, req, res);
    if (!validation.success) return;
    
    const careLogData = { ...validation.data };
    
    // Handle photoBase64 if provided
    if (careLogData.photoBase64) {
      try {
        // Generate a unique filename
        const timestamp = Date.now();
        const filename = `care_log_${careLogData.plantId}_${timestamp}.jpg`;
        
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(careLogData.photoBase64, 'base64');
        
        // Save the image to public/uploads
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(uploadDir, filename), imageBuffer);
        
        // Set photo URL in database
        careLogData.photo = `/uploads/${filename}`;
        
        // Remove base64 data before storing in DB
        delete careLogData.photoBase64;
      } catch (error) {
        console.error('Error saving care log photo:', error);
        return res.status(500).json({ message: 'Failed to save photo' });
      }
    }
    
    const careLog = await storage.createCareLog(careLogData);
    
    // Get the plant to update its reminders
    const plant = await storage.getPlant(careLogData.plantId);
    if (plant) {
      // For demo, use a fixed userId=1
      const userId = 1;
      
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
          lastWatered: new Date()
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
          lastFertilized: new Date()
        });
      }
    }
    
    res.status(201).json(careLog);
  });

  // Plant guides routes
  apiRouter.get("/api/plant-guides", async (req, res) => {
    const guides = await storage.getPlantGuides();
    res.json(guides);
  });

  apiRouter.get("/api/plant-guides/:type", async (req, res) => {
    const plantType = req.params.type;
    const guide = await storage.getPlantGuideByType(plantType);
    
    if (!guide) {
      return res.status(404).json({ message: "Plant guide not found" });
    }
    
    res.json(guide);
  });

  // Dashboard summary route
  apiRouter.get("/api/dashboard/care-needed", async (req, res) => {
    // For demo, use a fixed userId=1
    const userId = 1;
    const careNeeded = await storage.getPlantsNeedingCare(userId);
    res.json(careNeeded);
  });
  
  // Reminder routes
  apiRouter.get("/api/reminders", async (req, res) => {
    // For demo, use a fixed userId=1
    const userId = 1;
    const reminders = await storage.getReminders(userId);
    res.json(reminders);
  });
  
  apiRouter.get("/api/reminders/upcoming/:days", async (req, res) => {
    // For demo, use a fixed userId=1
    const userId = 1;
    const days = parseInt(req.params.days);
    
    if (isNaN(days)) {
      return res.status(400).json({ message: "Invalid days parameter" });
    }
    
    const reminders = await storage.getUpcomingReminders(userId, days);
    res.json(reminders);
  });
  
  apiRouter.get("/api/reminders/overdue", async (req, res) => {
    // For demo, use a fixed userId=1
    const userId = 1;
    const reminders = await storage.getOverdueReminders(userId);
    res.json(reminders);
  });
  
  apiRouter.get("/api/plants/:id/reminders", async (req, res) => {
    const plantId = parseInt(req.params.id);
    if (isNaN(plantId)) {
      return res.status(400).json({ message: "Invalid plant ID" });
    }
    
    const reminders = await storage.getRemindersByPlant(plantId);
    res.json(reminders);
  });
  
  apiRouter.post("/api/reminders", async (req, res) => {
    // We need to bring in the insertReminderSchema
    const { insertReminderSchema } = await import("@shared/schema");
    
    const validation = validateRequest(insertReminderSchema, req, res);
    if (!validation.success) return;
    
    const reminder = await storage.createReminder(validation.data);
    res.status(201).json(reminder);
  });
  
  apiRouter.patch("/api/reminders/:id", async (req, res) => {
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
  
  apiRouter.delete("/api/reminders/:id", async (req, res) => {
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
  
  apiRouter.post("/api/reminders/:id/complete", async (req, res) => {
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
  
  apiRouter.post("/api/reminders/:id/dismiss", async (req, res) => {
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
  apiRouter.post("/api/identify-plant", async (req, res) => {
    try {
      // Validate request
      const identifySchema = z.object({
        imageBase64: z.string().min(1),
      });
      
      const validation = validateRequest(identifySchema, req, res);
      if (!validation.success) return;
      
      // Extract base64 image data
      const { imageBase64 } = validation.data;
      
      // Process with OpenAI
      const result = await identifyPlantFromImage(imageBase64);
      
      // Return identification results
      res.json(result);
    } catch (error) {
      console.error("Error identifying plant:", error);
      res.status(500).json({
        message: "Failed to identify plant",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
