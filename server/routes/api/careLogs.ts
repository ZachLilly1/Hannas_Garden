import { Router } from "express";
import { storage } from "../../storage";
import * as logger from "../../services/logger";
import { insertCareLogSchema } from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { validateRequest, handleError } from "../../utils/requestValidator";
import { analyzePlantImageLightLevel } from "../../services/lightAnalyzer";
import { checkPlantOwnership } from "./plants";

// Using mergeParams allows us to access :id from the parent router (plantsRouter)
export const careLogsRouter = Router({ mergeParams: true });

// All routes in this file are automatically authenticated and ownership-checked
careLogsRouter.use(isAuthenticated, checkPlantOwnership);

// GET /api/plants/:id/care-logs - Get all care logs for a plant
careLogsRouter.get("/", async (req, res) => {s
  const plantId = parseInt(req.params.id, 10);
  const logs = await storage.getCareLogs(plantId);
  res.json(logs);
});

// POST /api/plants/:id/care-logs - Create a new care log for a plant
careLogsRouter.post("/", async (req, res) => {
  const plantId = parseInt(req.params.id, 10);
  const validation = validateRequest(insertCareLogSchema, req, res);
  if (!validation.success) return;

  const careLogData = { ...validation.data, plantId };

  // --- Photo & AI Analysis ---
  if (careLogData.photoBase64) {
    try {
      const processedPhoto = careLogData.photoBase64.startsWith('data:image/')
        ? careLogData.photoBase64
        : `data:image/jpeg;base64,${careLogData.photoBase64}`;
      
      careLogData.photo = processedPhoto;
      delete careLogData.photoBase64;

      // Fire-and-forget background analysis to avoid delaying the API response
      (async () => {
        try {
          const plant = (req as any).plant;
          logger.info(`Starting background analysis for care log on plant ${plant.id}`);

          // Light analysis
          const { sunlightLevel, confidence } = await analyzePlantImageLightLevel(processedPhoto);
          if (confidence !== "low") {
            await storage.updatePlant(plant.id, { sunlightLevel });
            logger.info(`Updated plant ${plant.id} sunlight level to: ${sunlightLevel}`);
          }

          // AI Journal Entry
          const { generateJournalEntry } = await import("../../services/openai");
          const plantWithCare = await storage.getPlantWithCare(plant.id);
          if (!plantWithCare) throw new Error("Failed to get plant with care details for journal");

          const careHistory = await storage.getPlantCareHistory(plant.id);
          const newCareLog = { ...careLogData, id: -1, timestamp: new Date().toISOString() }; // temp log for analysis
          const journalEntry = await generateJournalEntry(newCareLog as any, plantWithCare, careHistory);

          // Check for plant identity mismatch
          if (journalEntry.plantIdentityMatch && !journalEntry.plantIdentityMatch.matches) {
            const metadata = {
              plantIdentityMismatch: true,
              detectedPlant: journalEntry.plantIdentityMatch.detectedPlant,
            };
            careLogData.metadata = JSON.stringify(metadata);
          }
        } catch (analysisError) {
          logger.error("Error during background analysis:", handleError(analysisError));
        }
      })().catch(err => logger.error("Unhandled error in background analysis task:", err));

    } catch (error) {
      logger.error('Error processing photo data:', handleError(error));
      return res.status(500).json({ message: 'Failed to process photo' });
    }
  }

  const careLog = await storage.createCareLog(careLogData);

  // --- Update Plant State & Reminders ---
  const plant = (req as any).plant;
  const userId = req.user!.id;

  const updateReminderForCare = async (careType: 'water' | 'fertilize') => {
    const frequency = careType === 'water' ? plant.waterFrequency : plant.fertilizerFrequency;
    if (careLogData.careType !== careType || frequency <= 0) return;

    const existingReminders = await storage.getRemindersByPlant(plantId);
    const reminder = existingReminders.find(r => r.careType === careType);
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + frequency);

    if (reminder) {
      await storage.updateReminder(reminder.id, {
        dueDate: nextDueDate.toISOString(),
        status: 'pending'
      });
    } else {
      await storage.createReminder({
        plantId: plant.id,
        userId,
        title: `${careType.charAt(0).toUpperCase() + careType.slice(1)} your ${plant.name}`,
        dueDate: nextDueDate.toISOString(),
        careType,
      });
    }

    // Update last watered/fertilized date on the plant
    const updateField = careType === 'water' ? { lastWatered: new Date().toISOString() } : { lastFertilized: new Date().toISOString() };
    await storage.updatePlant(plant.id, updateField);
  };

  await updateReminderForCare('water');
  await updateReminderForCare('fertilize');

  res.status(201).json(careLog);
});