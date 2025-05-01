import { 
  users, plants, careLogs, plantGuides, reminders, communityTips, tipVotes,
  type User, type InsertUser, 
  type Plant, type InsertPlant,
  type CareLog, type InsertCareLog,
  type PlantGuide, type InsertPlantGuide,
  type PlantWithCare, type Reminder, type InsertReminder,
  type CommunityTip, type InsertCommunityTip, type CommunityTipWithUser,
  type TipVote, type InsertTipVote
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
  getPlantCareHistory(plantId: number, limit?: number): Promise<CareLog[]>;
  createCareLog(careLog: InsertCareLog): Promise<CareLog>;
  updateCareLog(id: number, data: Partial<InsertCareLog>): Promise<CareLog | undefined>;
  getPlantWithCare(id: number): Promise<PlantWithCare | undefined>;
  
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
  
  // Community Tips methods
  getCommunityTips(
    filters?: {
      plantType?: string;
      careCategory?: string;
      userId?: number;
      featured?: boolean;
    }, 
    limit?: number
  ): Promise<CommunityTipWithUser[]>;
  
  getCommunityTip(id: number): Promise<CommunityTipWithUser | undefined>;
  createCommunityTip(tip: InsertCommunityTip): Promise<CommunityTip>;
  updateCommunityTip(id: number, data: Partial<InsertCommunityTip>): Promise<CommunityTip | undefined>;
  deleteCommunityTip(id: number): Promise<boolean>;
  
  // Tip Voting methods
  addTipVote(tipId: number, userId: number): Promise<boolean>;
  removeTipVote(tipId: number, userId: number): Promise<boolean>;
  getUserVotedTips(userId: number): Promise<number[]>;
  
  // Admin functions for community tips
  featureCommunityTip(id: number, featured: boolean): Promise<boolean>;
  updateTipStatus(id: number, status: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  private defaultGuides: InsertPlantGuide[] = [
    {
      scientificName: "Monstera deliciosa",
      commonName: "Swiss Cheese Plant",
      category: "tropical",
      description: "Tropical plants thrive in warm, humid environments, native to regions near the equator. Interesting fact: Many tropical houseplants, like Pothos, can actually cleanse the air of certain toxins!",
      careTips: "Keep soil evenly moist but not soggy. Provide high humidity with regular misting or a humidifier. Protect from cold drafts and temperature below 65°F (18°C). Rotate regularly to ensure even growth.",
      idealWaterFrequency: 7,
      idealSunlight: "medium",
      idealFertilizerFrequency: 30
    },
    {
      scientificName: "Echeveria elegans",
      commonName: "Mexican Snowball",
      category: "succulent",
      description: "Succulents store water in their fleshy leaves, stems, or roots, and are drought-tolerant. Interesting fact: Some succulents can survive for months or even years without water by using their stored reserves!",
      careTips: "Allow soil to dry completely between waterings - overwatering is the #1 killer of succulents. Provide bright, direct light for at least 6 hours daily. Use well-draining cactus/succulent soil mix. Water less in winter.",
      idealWaterFrequency: 14,
      idealSunlight: "high",
      idealFertilizerFrequency: 90
    },
    {
      scientificName: "Ocimum basilicum",
      commonName: "Sweet Basil",
      category: "herb",
      description: "Culinary herbs are aromatic plants used for flavoring food and many have medicinal properties. Interesting fact: Regular harvesting of herbs actually encourages new growth, making your plant bushier and more productive!",
      careTips: "Most herbs need at least 6 hours of direct sunlight daily. Use well-draining soil and water when the top inch feels dry. Pinch off flowers to encourage leaf growth. Harvest in the morning when essential oils are strongest.",
      idealWaterFrequency: 3,
      idealSunlight: "high",
      idealFertilizerFrequency: 21
    },
    {
      scientificName: "Phalaenopsis amabilis",
      commonName: "Moth Orchid",
      category: "flowering",
      description: "Flowering plants produce blooms that add color and sometimes fragrance to your space. Interesting fact: Many flowering plants have evolved their colors, patterns and scents specifically to attract certain pollinators!",
      careTips: "Most flowering plants need direct morning sun and regular watering when the top inch of soil feels dry. Deadhead spent flowers to encourage more blooms. Fertilize weekly during blooming season with a phosphorus-rich fertilizer.",
      idealWaterFrequency: 5,
      idealSunlight: "medium",
      idealFertilizerFrequency: 14
    },
    {
      scientificName: "Nephrolepis exaltata",
      commonName: "Boston Fern",
      category: "fern",
      description: "Ferns are ancient plants that reproduce via spores and typically love shady, humid environments. Interesting fact: Ferns are one of Earth's oldest plant groups, with fossil records dating back over 360 million years!",
      careTips: "Keep soil consistently moist but not waterlogged. Provide high humidity (60%+) through misting, humidifiers, or pebble trays. Protect from direct sunlight and drafts. Remove any brown fronds at the base.",
      idealWaterFrequency: 3,
      idealSunlight: "low",
      idealFertilizerFrequency: 30
    },
    {
      scientificName: "Hedera helix",
      commonName: "English Ivy",
      category: "other",
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
      logger.error("Failed to initialize database:", error);
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
    logger.info(`Serving care logs for plant ${plantId}`);
    return db
      .select()
      .from(careLogs)
      .where(eq(careLogs.plantId, plantId))
      .orderBy(desc(careLogs.timestamp));
  }
  
  async getPlantCareHistory(plantId: number, limit?: number): Promise<CareLog[]> {
    logger.info(`Retrieving care history for plant ${plantId}${limit ? ` (limit: ${limit})` : ''}`);
    const query = db
      .select()
      .from(careLogs)
      .where(eq(careLogs.plantId, plantId))
      .orderBy(desc(careLogs.timestamp));
    
    if (limit) {
      return query.limit(limit);
    }
    
    return query;
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
  
  async updateCareLog(id: number, data: Partial<InsertCareLog>): Promise<CareLog | undefined> {
    const [updatedCareLog] = await db
      .update(careLogs)
      .set(data)
      .where(eq(careLogs.id, id))
      .returning();
    
    return updatedCareLog || undefined;
  }
  
  async getPlantWithCare(id: number): Promise<PlantWithCare | undefined> {
    // This is essentially the same as getPlant but with a more descriptive name
    // for the purpose of the journal entry generation
    return this.getPlant(id);
  }

  // Plant guide methods
  async getPlantGuides(): Promise<PlantGuide[]> {
    return db.select().from(plantGuides);
  }

  async getPlantGuideByType(plantIdentifier: string): Promise<PlantGuide | undefined> {
    if (!plantIdentifier) return undefined;
    
    // First, try to find by scientific name exact match
    let [guide] = await db
      .select()
      .from(plantGuides)
      .where(eq(plantGuides.scientificName, plantIdentifier));
    
    if (guide) return guide;
    
    // Next, try to find by category (formerly plant type)
    [guide] = await db
      .select()
      .from(plantGuides)
      .where(eq(plantGuides.category, plantIdentifier));
    
    if (guide) return guide;
    
    // If no guide found yet, try to match based on keywords in the identifier
    const identifierLower = plantIdentifier.toLowerCase();
    
    if (identifierLower.includes("monstera") || 
        identifierLower.includes("philodendron") || 
        identifierLower.includes("palm")) {
      [guide] = await db
        .select()
        .from(plantGuides)
        .where(eq(plantGuides.category, "tropical"));
      if (guide) return guide;
    }
    
    if (identifierLower.includes("cactus") || 
        identifierLower.includes("succulent") || 
        identifierLower.includes("aloe") || 
        identifierLower.includes("echeveria")) {
      [guide] = await db
        .select()
        .from(plantGuides)
        .where(eq(plantGuides.category, "succulent"));
      if (guide) return guide;
    }
    
    if (identifierLower.includes("herb") || 
        identifierLower.includes("mint") || 
        identifierLower.includes("basil") || 
        identifierLower.includes("thyme") || 
        identifierLower.includes("rosemary") || 
        identifierLower.includes("sage")) {
      [guide] = await db
        .select()
        .from(plantGuides)
        .where(eq(plantGuides.category, "herb"));
      if (guide) return guide;
    }
    
    if (identifierLower.includes("flower") || 
        identifierLower.includes("rosa") || 
        identifierLower.includes("tulip") || 
        identifierLower.includes("lily") || 
        identifierLower.includes("orchid")) {
      [guide] = await db
        .select()
        .from(plantGuides)
        .where(eq(plantGuides.category, "flowering"));
      if (guide) return guide;
    }
    
    if (identifierLower.includes("fern") || 
        identifierLower.includes("nephrolepis") || 
        identifierLower.includes("pteridophyta")) {
      [guide] = await db
        .select()
        .from(plantGuides)
        .where(eq(plantGuides.category, "fern"));
      if (guide) return guide;
    }
    
    // Default fallback to the "other" plant guide
    [guide] = await db
      .select()
      .from(plantGuides)
      .where(eq(plantGuides.category, "other"));
    return guide;
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
    
    // Get guide information if available, preferring scientific name when available
    let guide: PlantGuide | undefined;

    if (plant.scientificName) {
      guide = await this.getPlantGuideByType(plant.scientificName);
    }
    
    // Fall back to plant type if no scientific name or no guide found by scientific name
    if (!guide && plant.type) {
      guide = await this.getPlantGuideByType(plant.type);
    }
    
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
      // Convert string date to Date object if it's a string, otherwise use as is (should be a Date)
      dueDate: typeof reminderData.dueDate === 'string' ? new Date(reminderData.dueDate) : reminderData.dueDate
    };
    
    const [reminder] = await db
      .insert(reminders)
      .values(dbReminderData as any) // Using type assertion to bypass type check
      .returning();
    return reminder;
  }

  async updateReminder(id: number, data: Partial<InsertReminder>): Promise<Reminder | undefined> {
    // Handle date conversion if dueDate is included
    const dbData = { ...data };
    if (dbData.dueDate && typeof dbData.dueDate === 'string') {
      dbData.dueDate = new Date(dbData.dueDate) as any; // Using type assertion to bypass type check
    }
    
    const [updatedReminder] = await db
      .update(reminders)
      .set(dbData as any) // Using type assertion to bypass type check
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
  
  // Community Tips methods
  async getCommunityTips(
    filters?: {
      plantType?: string;
      careCategory?: string;
      userId?: number;
      featured?: boolean;
    },
    limit = 50
  ): Promise<CommunityTipWithUser[]> {
    // Build the conditions array
    let conditions = [eq(communityTips.status, 'active')];
    
    // Add filters to conditions if provided
    if (filters) {
      if (filters.plantType) {
        conditions.push(eq(communityTips.plantType, filters.plantType));
      }
      
      if (filters.careCategory) {
        conditions.push(eq(communityTips.careCategory, filters.careCategory));
      }
      
      if (filters.userId) {
        conditions.push(eq(communityTips.userId, filters.userId));
      }
      
      if (filters.featured !== undefined) {
        conditions.push(eq(communityTips.featured, filters.featured));
      }
    }
    
    // Execute the query with all conditions
    const tips = await db
      .select({
        id: communityTips.id,
        userId: communityTips.userId,
        title: communityTips.title,
        content: communityTips.content,
        plantType: communityTips.plantType,
        scientificName: communityTips.scientificName,
        careCategory: communityTips.careCategory,
        image: communityTips.image,
        createdAt: communityTips.createdAt,
        updatedAt: communityTips.updatedAt,
        status: communityTips.status,
        featured: communityTips.featured,
        likesCount: communityTips.likesCount,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl
      })
      .from(communityTips)
      .innerJoin(users, eq(communityTips.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(communityTips.createdAt))
      .limit(limit);
    
    return tips.map(tip => ({
      ...tip,
      userHasLiked: false // Will be updated in the API endpoint if needed
    }));
  }
  
  async getCommunityTip(id: number): Promise<CommunityTipWithUser | undefined> {
    const tips = await db
      .select({
        id: communityTips.id,
        userId: communityTips.userId,
        title: communityTips.title,
        content: communityTips.content,
        plantType: communityTips.plantType,
        scientificName: communityTips.scientificName,
        careCategory: communityTips.careCategory,
        image: communityTips.image,
        createdAt: communityTips.createdAt,
        updatedAt: communityTips.updatedAt,
        status: communityTips.status,
        featured: communityTips.featured,
        likesCount: communityTips.likesCount,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl
      })
      .from(communityTips)
      .innerJoin(users, eq(communityTips.userId, users.id))
      .where(eq(communityTips.id, id))
      .limit(1);
    
    if (tips.length === 0) {
      return undefined;
    }
    
    return {
      ...tips[0],
      userHasLiked: false // Will be updated in the API endpoint if needed
    };
  }
  
  async createCommunityTip(tipData: InsertCommunityTip): Promise<CommunityTip> {
    const now = new Date();
    
    const [tip] = await db
      .insert(communityTips)
      .values({
        ...tipData,
        createdAt: now,
        updatedAt: now,
        status: 'active',
        featured: false,
        likesCount: 0
      })
      .returning();
    
    return tip;
  }
  
  async updateCommunityTip(id: number, data: Partial<InsertCommunityTip>): Promise<CommunityTip | undefined> {
    const [tip] = await db
      .update(communityTips)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(communityTips.id, id))
      .returning();
    
    return tip || undefined;
  }
  
  async deleteCommunityTip(id: number): Promise<boolean> {
    const [tip] = await db
      .delete(communityTips)
      .where(eq(communityTips.id, id))
      .returning();
    
    return !!tip;
  }
  
  // Tip Voting methods
  async addTipVote(tipId: number, userId: number): Promise<boolean> {
    // Check if the user already voted for this tip
    const existingVotes = await db
      .select()
      .from(tipVotes)
      .where(and(
        eq(tipVotes.tipId, tipId),
        eq(tipVotes.userId, userId)
      ));
    
    // If user already voted, don't add another vote
    if (existingVotes.length > 0) {
      return false;
    }
    
    // Add the vote
    const [vote] = await db
      .insert(tipVotes)
      .values({
        tipId,
        userId,
        vote: 1
      })
      .returning();
    
    // Update the like count on the tip
    if (vote) {
      await db
        .update(communityTips)
        .set({
          likesCount: sql`${communityTips.likesCount} + 1`
        })
        .where(eq(communityTips.id, tipId));
      
      return true;
    }
    
    return false;
  }
  
  async removeTipVote(tipId: number, userId: number): Promise<boolean> {
    // Delete the vote
    const [deletedVote] = await db
      .delete(tipVotes)
      .where(and(
        eq(tipVotes.tipId, tipId),
        eq(tipVotes.userId, userId)
      ))
      .returning();
    
    // Update the like count on the tip
    if (deletedVote) {
      await db
        .update(communityTips)
        .set({
          likesCount: sql`${communityTips.likesCount} - 1`
        })
        .where(eq(communityTips.id, tipId));
      
      return true;
    }
    
    return false;
  }
  
  async getUserVotedTips(userId: number): Promise<number[]> {
    const userVotes = await db
      .select()
      .from(tipVotes)
      .where(eq(tipVotes.userId, userId));
    
    return userVotes.map(vote => vote.tipId);
  }
  
  // Admin functions for community tips
  async featureCommunityTip(id: number, featured: boolean): Promise<boolean> {
    const [tip] = await db
      .update(communityTips)
      .set({ featured })
      .where(eq(communityTips.id, id))
      .returning();
    
    return !!tip;
  }
  
  async updateTipStatus(id: number, status: string): Promise<boolean> {
    if (!['active', 'reported', 'removed'].includes(status)) {
      throw new Error("Invalid status value");
    }
    
    const [tip] = await db
      .update(communityTips)
      .set({ status })
      .where(eq(communityTips.id, id))
      .returning();
    
    return !!tip;
  }
}

export const storage = new DatabaseStorage();
