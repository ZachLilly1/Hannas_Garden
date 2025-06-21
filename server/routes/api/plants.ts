import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../../storage";
import * as logger from "../../services/logger";
import { insertPlantSchema } from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { validateRequest, handleError } from "../../utils/requestValidator";
import { careLogsRouter } from "./careLogs";

export const plantsRouter = Router();

/**
 * Middleware to check if the authenticated user owns the plant.
 * It also attaches the plant object to the request to avoid re-fetching.
 */
export const checkPlantOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plantId = parseInt(req.params.id, 10);
    if (isNaN(plantId)) {
      return res.status(400).json({ message: "Invalid plant ID" });
    }

    const plant = await storage.getPlant(plantId);
    if (!plant) {
      return res.status(404).json({ message: "Plant not found" });
    }

    if (plant.userId !== req.user!.id) {
      return res.status(403).json({ message: "You don't have permission to access this plant" });
    }

    // Attach plant to request object to avoid re-fetching in subsequent handlers
    (req as any).plant = plant;
    next();
  } catch (error) {
    next(error); // Pass errors to the global error handler
  }
};

// Mount nested routers
plantsRouter.use("/:id/care-logs", careLogsRouter);

// GET /api/plants - Get all plants for the authenticated user
plantsRouter.get("/", isAuthenticated, async (req, res) => {
  const userId = req.user!.id;
  const plants = await storage.getPlants(userId);
  res.json(plants);
});

// POST /api/plants - Create a new plant
plantsRouter.post("/", isAuthenticated, async (req, res) => {
  const validation = validateRequest(insertPlantSchema, req, res);
  if (!validation.success) return;

  const userId = req.user!.id;
  let plantData = { ...validation.data, userId };

  // If scientific name is provided, enrich with AI data
  if (validation.data.scientificName && !validation.data.notes) {
    try {
      const { getPlantCareRecommendations } = await import('../../services/openai');
      const careInfo = await getPlantCareRecommendations(validation.data.scientificName);
      
      if (!validation.data.waterFrequency) plantData.waterFrequency = careInfo.wateringGuidelines.frequency;
      if (!validation.data.fertilizerFrequency) plantData.fertilizerFrequency = careInfo.fertilizerGuidelines.frequency;
      if (!validation.data.sunlightLevel) plantData.sunlightLevel = careInfo.sunlightRequirements.level;
      
      plantData.notes = [
        careInfo.description,
        `Watering: ${careInfo.wateringGuidelines.notes}`,
        `Light: ${careInfo.sunlightRequirements.notes}`,
        `Fertilizing: ${careInfo.fertilizerGuidelines.notes}`,
        `Care Tips: ${careInfo.careTips}`,
        `Interesting Fact: ${careInfo.interestingFact}`
      ].join('\n\n');
    } catch (error) {
      logger.error("Error getting care recommendations:", handleError(error));
    }
  }

  const plant = await storage.createPlant(plantData);

  // Create automatic reminders
  if (plant.waterFrequency > 0) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + plant.waterFrequency);
    await storage.createReminder({
      plantId: plant.id,
      userId,
      title: `Water your ${plant.name}`,
      dueDate: dueDate.toISOString(),
      careType: 'water',
    });
  }

  if (plant.fertilizerFrequency > 0) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + plant.fertilizerFrequency);
    await storage.createReminder({
      plantId: plant.id,
      userId,
      title: `Fertilize your ${plant.name}`,
      dueDate: dueDate.toISOString(),
      careType: 'fertilize',
    });
  }

  res.status(201).json(plant);
});

// GET /api/plants/:id - Get a single plant
plantsRouter.get("/:id", isAuthenticated, checkPlantOwnership, async (req, res) => {
  // The plant is attached to req.plant by the checkPlantOwnership middleware
  res.json((req as any).plant);
});

// PATCH /api/plants/:id - Update a plant
plantsRouter.patch("/:id", isAuthenticated, checkPlantOwnership, async (req, res) => {
  const plantId = parseInt(req.params.id, 10);
  const validation = validateRequest(insertPlantSchema.partial(), req, res);
  if (!validation.success) return;

  const originalPlant = (req as any).plant;
  const updatedPlant = await storage.updatePlant(plantId, validation.data);
  if (!updatedPlant) {
    return res.status(404).json({ message: "Plant not found during update" });
  }

  const userId = req.user!.id;

  // Logic to update reminders if frequency changes
  const updateReminderIfNeeded = async (careType: 'water' | 'fertilize', newFrequency?: number) => {
    const oldFrequency = careType === 'water' ? originalPlant.waterFrequency : originalPlant.fertilizerFrequency;
    if (newFrequency === undefined || newFrequency === oldFrequency) return;

    const existingReminders = await storage.getRemindersByPlant(plantId);
    const reminder = existingReminders.find(r => r.careType === careType);

    if (newFrequency > 0) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + newFrequency);
      const reminderData = {
        title: `${careType.charAt(0).toUpperCase() + careType.slice(1)} your ${updatedPlant.name}`,
        dueDate: dueDate.toISOString(),
        recurringInterval: newFrequency,
      };

      if (reminder) {
        await storage.updateReminder(reminder.id, reminderData);
      } else {
        await storage.createReminder({
          ...reminderData,
          plantId: updatedPlant.id,
          userId,
          careType,
        });
      }
    } else if (reminder) {
      await storage.deleteReminder(reminder.id);
    }
  };

  await updateReminderIfNeeded('water', validation.data.waterFrequency);
  await updateReminderIfNeeded('fertilize', validation.data.fertilizerFrequency);

  res.json(updatedPlant);
});

// DELETE /api/plants/:id - Delete a plant
plantsRouter.delete("/:id", isAuthenticated, checkPlantOwnership, async (req, res) => {
  const plantId = parseInt(req.params.id, 10);
  // Note: Deleting a plant should also cascade to delete related care logs, reminders, etc.
  // This is best handled by database constraints (ON DELETE CASCADE).
  const success = await storage.deletePlant(plantId);
  if (!success) {
    return res.status(404).json({ message: "Plant not found during deletion" });
  }
  res.status(204).send();
});