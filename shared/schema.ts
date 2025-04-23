import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Plant schema
export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  location: text("location").notNull(),
  image: text("image"),
  notes: text("notes"),
  waterFrequency: integer("water_frequency").notNull(),
  sunlightLevel: text("sunlight_level").notNull(),
  fertilizerFrequency: integer("fertilizer_frequency").notNull(),
  lastWatered: date("last_watered"),
  lastFertilized: date("last_fertilized"),
  status: text("status").default("healthy"),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id").notNull(),
});

export const insertPlantSchema = createInsertSchema(plants).omit({
  id: true,
  createdAt: true, 
});

// Care log schema
export const careLogs = pgTable("care_logs", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").notNull(),
  careType: text("care_type").notNull(), // water, fertilize, etc.
  timestamp: timestamp("timestamp").defaultNow(),
  notes: text("notes"),
  photo: text("photo"),
});

export const insertCareLogSchema = createInsertSchema(careLogs).omit({
  id: true,
  timestamp: true,
}).extend({
  photoBase64: z.string().optional(),
});

// Plant guide schema
export const plantGuides = pgTable("plant_guides", {
  id: serial("id").primaryKey(),
  plantType: text("plant_type").notNull().unique(),
  description: text("description").notNull(),
  careTips: text("care_tips").notNull(),
  idealWaterFrequency: integer("ideal_water_frequency").notNull(),
  idealSunlight: text("ideal_sunlight").notNull(),
  idealFertilizerFrequency: integer("ideal_fertilizer_frequency").notNull(),
});

export const insertPlantGuideSchema = createInsertSchema(plantGuides).omit({
  id: true,
});

// Types for frontend use
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Plant = typeof plants.$inferSelect;
export type InsertPlant = z.infer<typeof insertPlantSchema>;

export type CareLog = typeof careLogs.$inferSelect;
export type InsertCareLog = z.infer<typeof insertCareLogSchema>;

export type PlantGuide = typeof plantGuides.$inferSelect;
export type InsertPlantGuide = z.infer<typeof insertPlantGuideSchema>;

// Enum-like constants
export const SUNLIGHT_LEVELS = ['low', 'medium', 'high'] as const;
export const CARE_TYPES = ['water', 'fertilize', 'repot', 'prune', 'other'] as const;
export const PLANT_STATUSES = ['healthy', 'needs_water', 'needs_fertilizer', 'unhealthy'] as const;

// Extended plant type (merged with next care dates)
export type PlantWithCare = Plant & {
  nextWatering: Date | null;
  nextFertilizing: Date | null;
  guide?: PlantGuide;
};
