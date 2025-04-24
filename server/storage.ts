import { 
  users, plants, careLogs, plantGuides, reminders,
  type User, type InsertUser, 
  type Plant, type InsertPlant,
  type CareLog, type InsertCareLog,
  type PlantGuide, type InsertPlantGuide,
  type PlantWithCare, type Reminder, type InsertReminder
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: number, data: Partial<User>): Promise<User | undefined>;
  updateUserPassword(id: number, hashedPassword: string): Promise<boolean>;
  updateUserLastLogin(id: number): Promise<boolean>;
  
  // Plant methods
  getPlants(userId: number): Promise<PlantWithCare[]>;
  getPlant(id: number): Promise<PlantWithCare | undefined>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(id: number, plant: Partial<InsertPlant>): Promise<Plant | undefined>;
  deletePlant(id: number): Promise<boolean>;
  
  // Care log methods
  getCareLogs(plantId: number): Promise<CareLog[]>;
  createCareLog(careLog: InsertCareLog): Promise<CareLog>;
  
  // Plant guide methods
  getPlantGuides(): Promise<PlantGuide[]>;
  getPlantGuideByType(plantType: string): Promise<PlantGuide | undefined>;
  createPlantGuide(guide: InsertPlantGuide): Promise<PlantGuide>;
  
  // Care summary
  getPlantsNeedingCare(userId: number): Promise<{
    needsWater: PlantWithCare[];
    needsFertilizer: PlantWithCare[];
  }>;
  
  // Reminder methods
  getReminders(userId: number): Promise<Reminder[]>;
  getRemindersByPlant(plantId: number): Promise<Reminder[]>;
  getUpcomingReminders(userId: number, days: number): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: number, data: Partial<InsertReminder>): Promise<Reminder | undefined>;
  deleteReminder(id: number): Promise<boolean>;
  markReminderComplete(id: number): Promise<Reminder | undefined>;
  markReminderDismissed(id: number): Promise<Reminder | undefined>;
  getOverdueReminders(userId: number): Promise<Reminder[]>;
}

export class DatabaseStorage implements IStorage {
  private defaultGuides: InsertPlantGuide[] = [
    {
      plantType: "tropical",
      description: "Tropical plants thrive in warm, humid environments, native to regions near the equator. Interesting fact: Many tropical houseplants, like Pothos, can actually cleanse the air of certain toxins!",
      careTips: "Keep soil evenly moist but not soggy. Provide high humidity with regular misting or a humidifier. Protect from cold drafts and temperature below 65°F (18°C). Rotate regularly to ensure even growth.",
      idealWaterFrequency: 7,
      idealSunlight: "medium",
      idealFertilizerFrequency: 30
    },
    {
      plantType: "succulent",
      description: "Succulents store water in their fleshy leaves, stems, or roots, and are drought-tolerant. Interesting fact: Some succulents can survive for months or even years without water by using their stored reserves!",
      careTips: "Allow soil to dry completely between waterings - overwatering is the #1 killer of succulents. Provide bright, direct light for at least 6 hours daily. Use well-draining cactus/succulent soil mix. Water less in winter.",
      idealWaterFrequency: 14,
      idealSunlight: "high",
      idealFertilizerFrequency: 90
    },
    {
      plantType: "herb",
      description: "Culinary herbs are aromatic plants used for flavoring food and many have medicinal properties. Interesting fact: Regular harvesting of herbs actually encourages new growth, making your plant bushier and more productive!",
      careTips: "Most herbs need at least 6 hours of direct sunlight daily. Use well-draining soil and water when the top inch feels dry. Pinch off flowers to encourage leaf growth. Harvest in the morning when essential oils are strongest.",
      idealWaterFrequency: 3,
      idealSunlight: "high",
      idealFertilizerFrequency: 21
    },
    {
      plantType: "flowering",
      description: "Flowering plants produce blooms that add color and sometimes fragrance to your space. Interesting fact: Many flowering plants have evolved their colors, patterns and scents specifically to attract certain pollinators!",
      careTips: "Most flowering plants need direct morning sun and regular watering when the top inch of soil feels dry. Deadhead spent flowers to encourage more blooms. Fertilize weekly during blooming season with a phosphorus-rich fertilizer.",
      idealWaterFrequency: 5,
      idealSunlight: "medium",
      idealFertilizerFrequency: 14
    },
    {
      plantType: "fern",
      description: "Ferns are ancient plants that reproduce via spores and typically love shady, humid environments. Interesting fact: Ferns are one of Earth's oldest plant groups, with fossil records dating back over 360 million years!",
      careTips: "Keep soil consistently moist but not waterlogged. Provide high humidity (60%+) through misting, humidifiers, or pebble trays. Protect from direct sunlight and drafts. Remove any brown fronds at the base.",
      idealWaterFrequency: 3,
      idealSunlight: "low",
      idealFertilizerFrequency: 30
    },
    {
      plantType: "other",
      description: "This category includes specialized plants like English Ivy, palms, and other unique species. Interesting fact: Plants like English Ivy are excellent climbers that can attach to surfaces using tiny root-like structures called holdfasts!",
      careTips: "Research your specific plant variety for precise care. Generally, check soil moisture before watering and adjust light levels based on leaf color. Watch for pest issues on the undersides of leaves. Trim damaged foliage promptly.",
      idealWaterFrequency: 5,
      idealSunlight: "medium",
      idealFertilizerFrequency: 30
    }
  ];

  constructor() {
    // Seed plant guides if they don't already exist
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      const guides = await this.getPlantGuides();
      if (guides.length === 0) {
        // No guides exist yet, seed them
        for (const guide of this.defaultGuides) {
          await this.createPlantGuide(guide);
        }
      }
    } catch (error) {
      console.error("Failed to initialize database:", error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserProfile(id: number, data: Partial<User>): Promise<User | undefined> {
    // Extract fields we handle specially
    const { password, username, id: userId, email, ...otherData } = data;
    
    // Handle email updates separately (with validation)
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await this.getUserByEmail(email);
      if (existingUser && existingUser.id !== id) {
        throw new Error("Email is already in use by another account");
      }
    }
    
    // Combine email with other data if it exists
    const updateData = email ? { ...otherData, email } : otherData;
    
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser || undefined;
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<boolean> {
    const [updatedUser] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id))
      .returning();
    
    return !!updatedUser;
  }

  async updateUserLastLogin(id: number): Promise<boolean> {
    const [updatedUser] = await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return !!updatedUser;
  }

  // Plant methods
  async getPlants(userId: number): Promise<PlantWithCare[]> {
    const userPlants = await db
      .select()
      .from(plants)
      .where(eq(plants.userId, userId));
    
    // Add care info to plants
    const plantsWithCare: PlantWithCare[] = [];
    for (const plant of userPlants) {
      plantsWithCare.push(await this.addCareInfo(plant));
    }
    
    return plantsWithCare;
  }

  async getPlant(id: number): Promise<PlantWithCare | undefined> {
    const [plant] = await db
      .select()
      .from(plants)
      .where(eq(plants.id, id));
    
    if (!plant) return undefined;
    
    return this.addCareInfo(plant);
  }

  async createPlant(plantData: InsertPlant): Promise<Plant> {
    // Ensure all required fields have values
    const plantDataWithDefaults = {
      ...plantData,
      status: plantData.status ?? 'healthy', 
      image: plantData.image ?? null,
      notes: plantData.notes ?? null,
      lastWatered: plantData.lastWatered ?? null,
      lastFertilized: plantData.lastFertilized ?? null
    };
    
    const [plant] = await db
      .insert(plants)
      .values(plantDataWithDefaults)
      .returning();
    return plant;
  }

  async updatePlant(id: number, plantData: Partial<InsertPlant>): Promise<Plant | undefined> {
    const [updatedPlant] = await db
      .update(plants)
      .set(plantData)
      .where(eq(plants.id, id))
      .returning();
    return updatedPlant || undefined;
  }

  async deletePlant(id: number): Promise<boolean> {
    const [deletedPlant] = await db
      .delete(plants)
      .where(eq(plants.id, id))
      .returning();
    return !!deletedPlant;
  }

  // Care log methods
  async getCareLogs(plantId: number): Promise<CareLog[]> {
    return db
      .select()
      .from(careLogs)
      .where(eq(careLogs.plantId, plantId))
      .orderBy(desc(careLogs.timestamp));
  }

  async createCareLog(careLogData: InsertCareLog): Promise<CareLog> {
    // Ensure all required fields have values
    const careLogDataWithDefaults = {
      ...careLogData,
      notes: careLogData.notes ?? null
    };
    
    const [careLog] = await db
      .insert(careLogs)
      .values(careLogDataWithDefaults)
      .returning();
    
    // Update plant's last watered or fertilized date
    if (careLogData.careType === 'water') {
      // Convert Date to string in ISO format for date columns
      const lastWateredDate = new Date().toISOString().split('T')[0];
      await db
        .update(plants)
        .set({ lastWatered: lastWateredDate })
        .where(eq(plants.id, careLogData.plantId));
    } else if (careLogData.careType === 'fertilize') {
      // Convert Date to string in ISO format for date columns
      const lastFertilizedDate = new Date().toISOString().split('T')[0];
      await db
        .update(plants)
        .set({ lastFertilized: lastFertilizedDate })
        .where(eq(plants.id, careLogData.plantId));
    }
    
    return careLog;
  }

  // Plant guide methods
  async getPlantGuides(): Promise<PlantGuide[]> {
    return db.select().from(plantGuides);
  }

  async getPlantGuideByType(plantType: string): Promise<PlantGuide | undefined> {
    const [guide] = await db
      .select()
      .from(plantGuides)
      .where(eq(plantGuides.plantType, plantType));
    return guide || undefined;
  }

  async createPlantGuide(guideData: InsertPlantGuide): Promise<PlantGuide> {
    const [guide] = await db
      .insert(plantGuides)
      .values(guideData)
      .returning();
    return guide;
  }

  // Care summary
  async getPlantsNeedingCare(userId: number): Promise<{
    needsWater: PlantWithCare[];
    needsFertilizer: PlantWithCare[];
  }> {
    const userPlants = await this.getPlants(userId);
    const today = new Date();
    
    const needsWater = userPlants.filter(plant => {
      return plant.nextWatering && plant.nextWatering <= today;
    });
    
    const needsFertilizer = userPlants.filter(plant => {
      return plant.nextFertilizing && plant.nextFertilizing <= today;
    });
    
    return { needsWater, needsFertilizer };
  }

  // Helper method to calculate next care dates for a plant
  private async addCareInfo(plant: Plant): Promise<PlantWithCare> {
    let nextWatering: Date | null = null;
    let nextFertilizing: Date | null = null;
    
    // Calculate next watering date
    if (plant.lastWatered) {
      const lastWateredDate = new Date(plant.lastWatered);
      if (!isNaN(lastWateredDate.getTime())) {
        nextWatering = new Date(lastWateredDate);
        nextWatering.setDate(lastWateredDate.getDate() + plant.waterFrequency);
      }
    } else if (plant.createdAt) {
      const createdAtDate = new Date(plant.createdAt);
      if (!isNaN(createdAtDate.getTime())) {
        nextWatering = new Date(createdAtDate);
        nextWatering.setDate(createdAtDate.getDate() + plant.waterFrequency);
      }
    }
    
    // Calculate next fertilizing date
    if (plant.lastFertilized) {
      const lastFertilizedDate = new Date(plant.lastFertilized);
      if (!isNaN(lastFertilizedDate.getTime())) {
        nextFertilizing = new Date(lastFertilizedDate);
        nextFertilizing.setDate(lastFertilizedDate.getDate() + plant.fertilizerFrequency);
      }
    } else if (plant.fertilizerFrequency > 0 && plant.createdAt) {
      const createdAtDate = new Date(plant.createdAt);
      if (!isNaN(createdAtDate.getTime())) {
        nextFertilizing = new Date(createdAtDate);
        nextFertilizing.setDate(createdAtDate.getDate() + plant.fertilizerFrequency);
      }
    }
    
    // Get guide information if available
    const guide = await this.getPlantGuideByType(plant.type);
    
    return { ...plant, nextWatering, nextFertilizing, guide };
  }

  // Reminder methods
  async getReminders(userId: number): Promise<Reminder[]> {
    return db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, userId))
      .orderBy(asc(reminders.dueDate));
  }

  async getRemindersByPlant(plantId: number): Promise<Reminder[]> {
    return db
      .select()
      .from(reminders)
      .where(eq(reminders.plantId, plantId))
      .orderBy(asc(reminders.dueDate));
  }

  async getUpcomingReminders(userId: number, days: number): Promise<Reminder[]> {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);
    
    // Format dates as ISO strings for comparison
    const todayStr = today.toISOString();
    const futureDateStr = futureDate.toISOString();
    
    return db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          and(
            eq(reminders.status, "pending"),
            sql`${reminders.dueDate} >= ${todayStr} AND ${reminders.dueDate} <= ${futureDateStr}`
          )
        )
      )
      .orderBy(asc(reminders.dueDate));
  }

  async createReminder(reminderData: InsertReminder): Promise<Reminder> {
    // Convert string date to Date object for database
    const dbReminderData = {
      ...reminderData,
      dueDate: new Date(reminderData.dueDate)
    };
    
    const [reminder] = await db
      .insert(reminders)
      .values(dbReminderData)
      .returning();
    return reminder;
  }

  async updateReminder(id: number, data: Partial<InsertReminder>): Promise<Reminder | undefined> {
    // Handle date conversion if dueDate is included
    const dbData = { ...data };
    if (dbData.dueDate) {
      dbData.dueDate = new Date(dbData.dueDate);
    }
    
    const [updatedReminder] = await db
      .update(reminders)
      .set(dbData)
      .where(eq(reminders.id, id))
      .returning();
    return updatedReminder || undefined;
  }

  async deleteReminder(id: number): Promise<boolean> {
    const [deletedReminder] = await db
      .delete(reminders)
      .where(eq(reminders.id, id))
      .returning();
    return !!deletedReminder;
  }

  async markReminderComplete(id: number): Promise<Reminder | undefined> {
    const [updatedReminder] = await db
      .update(reminders)
      .set({ status: "completed" })
      .where(eq(reminders.id, id))
      .returning();
    return updatedReminder || undefined;
  }

  async markReminderDismissed(id: number): Promise<Reminder | undefined> {
    const [updatedReminder] = await db
      .update(reminders)
      .set({ status: "dismissed" })
      .where(eq(reminders.id, id))
      .returning();
    return updatedReminder || undefined;
  }

  async getOverdueReminders(userId: number): Promise<Reminder[]> {
    const today = new Date();
    const todayStr = today.toISOString();
    
    return db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          and(
            eq(reminders.status, "pending"),
            // Due date is before today
            sql`${reminders.dueDate} < ${todayStr}`
          )
        )
      )
      .orderBy(asc(reminders.dueDate));
  }
}

export const storage = new DatabaseStorage();
