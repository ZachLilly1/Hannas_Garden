import { 
  users, plants, careLogs, plantGuides,
  type User, type InsertUser, 
  type Plant, type InsertPlant,
  type CareLog, type InsertCareLog,
  type PlantGuide, type InsertPlantGuide,
  type PlantWithCare
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
}

export class DatabaseStorage implements IStorage {
  private defaultGuides: InsertPlantGuide[] = [
    {
      plantType: "tropical",
      description: "Tropical plants thrive in warm, humid environments, native to regions near the equator.",
      careTips: "Keep soil evenly moist, provide high humidity, and protect from cold drafts.",
      idealWaterFrequency: 7,
      idealSunlight: "medium",
      idealFertilizerFrequency: 30
    },
    {
      plantType: "succulent",
      description: "Succulents store water in their fleshy leaves, stems, or roots, and are drought-tolerant.",
      careTips: "Allow soil to dry completely between waterings, provide bright light, use well-draining soil.",
      idealWaterFrequency: 14,
      idealSunlight: "high",
      idealFertilizerFrequency: 90
    },
    {
      plantType: "herb",
      description: "Culinary herbs are aromatic plants used for flavoring food and some have medicinal properties.",
      careTips: "Most herbs need at least 6 hours of direct sunlight daily and well-draining soil.",
      idealWaterFrequency: 3,
      idealSunlight: "high",
      idealFertilizerFrequency: 30
    },
    {
      plantType: "flowering",
      description: "Flowering plants produce blooms that add color and sometimes fragrance to your space.",
      careTips: "Most flowering plants need regular watering and fertilizing during blooming season.",
      idealWaterFrequency: 5,
      idealSunlight: "medium",
      idealFertilizerFrequency: 14
    },
    {
      plantType: "fern",
      description: "Ferns are ancient plants that reproduce via spores and typically love shady, humid environments.",
      careTips: "Keep soil consistently moist, provide high humidity, and protect from direct sunlight.",
      idealWaterFrequency: 3,
      idealSunlight: "low",
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
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
}

export const storage = new DatabaseStorage();
