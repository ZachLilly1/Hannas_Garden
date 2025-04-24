import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"), // User biography
  preferredUnits: text("preferred_units").default("metric"),
  timezone: text("timezone").default("UTC"),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  prefersDarkMode: boolean("prefers_dark_mode").default(false),
  viewPreference: text("view_preference").default("list"), // list or grid
  weatherLocation: text("weather_location"), // For weather integration
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
}).extend({
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const userProfileSchema = createInsertSchema(users).pick({
  displayName: true,
  email: true,
  bio: true,
  preferredUnits: true,
  timezone: true,
  notificationsEnabled: true,
  avatarUrl: true,
  prefersDarkMode: true,
  viewPreference: true,
  weatherLocation: true,
  onboardingCompleted: true,
});

// Plant schema
export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  scientificName: text("scientific_name"),  // Scientific name becomes more important
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
  // Keep type for backward compatibility, but it's no longer required
  type: text("type").default("identified"),
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
  metadata: text("metadata"),  // For storing health diagnosis and other structured data
});

export const insertCareLogSchema = createInsertSchema(careLogs).omit({
  id: true,
  timestamp: true,
}).extend({
  photoBase64: z.string().optional(),
  metadata: z.string().optional(),
});

// Plant guide schema - now based on scientific name rather than generic plant type
export const plantGuides = pgTable("plant_guides", {
  id: serial("id").primaryKey(),
  scientificName: text("scientific_name").notNull().unique(), // Changed from plantType to scientificName
  commonName: text("common_name").notNull(),
  description: text("description").notNull(),
  careTips: text("care_tips").notNull(),
  idealWaterFrequency: integer("ideal_water_frequency").notNull(),
  idealSunlight: text("ideal_sunlight").notNull(),
  idealFertilizerFrequency: integer("ideal_fertilizer_frequency").notNull(),
  category: text("category"), // Optional category for organization (e.g. succulent, tropical, etc.)
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

// Reminder schema
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").notNull(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").default(""), // Allow empty message
  dueDate: timestamp("due_date").notNull(),
  careType: text("care_type").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, dismissed
  recurring: boolean("recurring").notNull().default(false),
  recurringInterval: integer("recurring_interval"), // days
  notified: boolean("notified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
}).extend({
  dueDate: z.string(), // Allow string for ISO format
  plantId: z.number().int(), // Ensure it's a number
  message: z.string().optional().default(""), // Make message optional with empty default
});

// Enum-like constants
export const SUNLIGHT_LEVELS = ['low', 'medium', 'high'] as const;
export const CARE_TYPES = ['water', 'fertilize', 'repot', 'prune', 'health_check', 'other'] as const;
export const PLANT_STATUSES = ['healthy', 'needs_water', 'needs_fertilizer', 'unhealthy'] as const;
export const REMINDER_STATUSES = ['pending', 'completed', 'dismissed'] as const;

// Extended plant type (merged with next care dates)
export type PlantWithCare = Plant & {
  nextWatering: Date | null;
  nextFertilizing: Date | null;
  guide?: PlantGuide;
};

// Type definitions
export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
