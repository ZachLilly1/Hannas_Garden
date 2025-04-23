import { 
  users, plants, careLogs, plantGuides,
  type User, type InsertUser, 
  type Plant, type InsertPlant,
  type CareLog, type InsertCareLog,
  type PlantGuide, type InsertPlantGuide,
  type PlantWithCare
} from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private plants: Map<number, Plant>;
  private careLogs: Map<number, CareLog>;
  private plantGuides: Map<number, PlantGuide>;
  private userIdCounter: number;
  private plantIdCounter: number;
  private careLogIdCounter: number;
  private plantGuideIdCounter: number;

  constructor() {
    this.users = new Map();
    this.plants = new Map();
    this.careLogs = new Map();
    this.plantGuides = new Map();
    this.userIdCounter = 1;
    this.plantIdCounter = 1;
    this.careLogIdCounter = 1;
    this.plantGuideIdCounter = 1;
    
    // Initialize with default plant guides
    this.seedPlantGuides();
  }

  private seedPlantGuides() {
    const defaultGuides: InsertPlantGuide[] = [
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
    
    for (const guide of defaultGuides) {
      this.createPlantGuide(guide);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Plant methods
  async getPlants(userId: number): Promise<PlantWithCare[]> {
    const userPlants = Array.from(this.plants.values()).filter(
      (plant) => plant.userId === userId
    );
    
    return userPlants.map(plant => this.addCareInfo(plant));
  }

  async getPlant(id: number): Promise<PlantWithCare | undefined> {
    const plant = this.plants.get(id);
    if (!plant) return undefined;
    
    return this.addCareInfo(plant);
  }

  async createPlant(plantData: InsertPlant): Promise<Plant> {
    const id = this.plantIdCounter++;
    const createdAt = new Date();
    const plant: Plant = { ...plantData, id, createdAt };
    this.plants.set(id, plant);
    return plant;
  }

  async updatePlant(id: number, plantData: Partial<InsertPlant>): Promise<Plant | undefined> {
    const existingPlant = this.plants.get(id);
    if (!existingPlant) return undefined;
    
    const updatedPlant = { ...existingPlant, ...plantData };
    this.plants.set(id, updatedPlant);
    return updatedPlant;
  }

  async deletePlant(id: number): Promise<boolean> {
    return this.plants.delete(id);
  }

  // Care log methods
  async getCareLogs(plantId: number): Promise<CareLog[]> {
    return Array.from(this.careLogs.values()).filter(
      (log) => log.plantId === plantId
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async createCareLog(careLogData: InsertCareLog): Promise<CareLog> {
    const id = this.careLogIdCounter++;
    const timestamp = new Date();
    const careLog: CareLog = { ...careLogData, id, timestamp };
    this.careLogs.set(id, careLog);
    
    // Update plant's last watered or fertilized date
    const plant = this.plants.get(careLogData.plantId);
    if (plant) {
      if (careLogData.careType === 'water') {
        const updatedPlant = { ...plant, lastWatered: new Date() };
        this.plants.set(plant.id, updatedPlant);
      } else if (careLogData.careType === 'fertilize') {
        const updatedPlant = { ...plant, lastFertilized: new Date() };
        this.plants.set(plant.id, updatedPlant);
      }
    }
    
    return careLog;
  }

  // Plant guide methods
  async getPlantGuides(): Promise<PlantGuide[]> {
    return Array.from(this.plantGuides.values());
  }

  async getPlantGuideByType(plantType: string): Promise<PlantGuide | undefined> {
    return Array.from(this.plantGuides.values()).find(
      (guide) => guide.plantType === plantType
    );
  }

  async createPlantGuide(guideData: InsertPlantGuide): Promise<PlantGuide> {
    const id = this.plantGuideIdCounter++;
    const guide: PlantGuide = { ...guideData, id };
    this.plantGuides.set(id, guide);
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
  private addCareInfo(plant: Plant): PlantWithCare {
    let nextWatering: Date | null = null;
    let nextFertilizing: Date | null = null;
    
    if (plant.lastWatered) {
      nextWatering = new Date(plant.lastWatered);
      nextWatering.setDate(nextWatering.getDate() + plant.waterFrequency);
    } else {
      // If never watered, schedule from creation date
      nextWatering = new Date(plant.createdAt);
      nextWatering.setDate(nextWatering.getDate() + plant.waterFrequency);
    }
    
    if (plant.lastFertilized) {
      nextFertilizing = new Date(plant.lastFertilized);
      nextFertilizing.setDate(nextFertilizing.getDate() + plant.fertilizerFrequency);
    } else if (plant.fertilizerFrequency > 0) {
      // If never fertilized and fertilizer is required, schedule from creation date
      nextFertilizing = new Date(plant.createdAt);
      nextFertilizing.setDate(nextFertilizing.getDate() + plant.fertilizerFrequency);
    }
    
    // Get guide information if available
    const guide = Array.from(this.plantGuides.values()).find(
      guide => guide.plantType === plant.type
    );
    
    return { ...plant, nextWatering, nextFertilizing, guide };
  }
}

export const storage = new MemStorage();
