import { pgTable, text, serial, integer, boolean, timestamp, date, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --> Recommendation: Define ENUM types at the top for reusability and database-level validation.
export const sunlightLevelEnum = pgEnum('sunlight_level', ['low', 'medium', 'high']);
export const plantStatusEnum = pgEnum('plant_status', ['healthy', 'needs_water', 'needs_fertilizer', 'unhealthy']);
export const careTypeEnum = pgEnum('care_type', ['water', 'fertilize', 'repot', 'prune', 'health_check', 'other']);
export const reminderStatusEnum = pgEnum('reminder_status', ['pending', 'completed', 'dismissed']);
export const careCategoryEnum = pgEnum('care_category', ['watering', 'sunlight', 'soil', 'fertilizing', 'pests', 'diseases', 'propagation', 'general']);
export const tipStatusEnum = pgEnum('tip_status', ['active', 'reported', 'removed']);
export const activityTypeEnum = pgEnum('activity_type', ['plant_added', 'care_log_added', 'plant_shared', 'care_log_shared', 'profile_updated', 'follow_user']);

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"), // User biography
  // --> Note: Some of these preferences could be moved to profileSettings for better separation of concerns in the future.
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
  scientificName: text("scientific_name"),
  location: text("location").notNull(),
  image: text("image"),
  notes: text("notes"),
  waterFrequency: integer("water_frequency").notNull(),
  // --> Recommendation: Use pgEnum for type safety and efficiency.
  sunlightLevel: sunlightLevelEnum("sunlight_level").notNull(),
  fertilizerFrequency: integer("fertilizer_frequency").notNull(),
  lastWatered: date("last_watered"),
  lastFertilized: date("last_fertilized"),
  // --> Recommendation: Use pgEnum for type safety and efficiency.
  status: plantStatusEnum("status").default("healthy"),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id").notNull(),
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
  // --> Recommendation: Use pgEnum for type safety and efficiency.
  careType: careTypeEnum("care_type").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  notes: text("notes"),
  photo: text("photo"),
  // --> Recommendation: Use jsonb for efficient JSON storage and querying in PostgreSQL.
  metadata: jsonb("metadata"),
});

export const insertCareLogSchema = createInsertSchema(careLogs).omit({
  id: true,
  timestamp: true,
}).extend({
  photoBase64: z.string().optional(),
  // Zod can validate the shape of the metadata if needed, e.g., metadata: z.object({ ... }).optional()
  metadata: z.any().optional(),
});


// Plant guide schema
export const plantGuides = pgTable("plant_guides", {
  id: serial("id").primaryKey(),
  scientificName: text("scientific_name").notNull().unique(),
  commonName: text("common_name").notNull(),
  description: text("description").notNull(),
  careTips: text("care_tips").notNull(),
  idealWaterFrequency: integer("ideal_water_frequency").notNull(),
  idealSunlight: sunlightLevelEnum("ideal_sunlight").notNull(), // --> Recommendation: Use pgEnum
  idealFertilizerFrequency: integer("ideal_fertilizer_frequency").notNull(),
  category: text("category"),
});

export const insertPlantGuideSchema = createInsertSchema(plantGuides).omit({
  id: true,
});

// Reminder schema
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").notNull(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").default(""),
  dueDate: timestamp("due_date").notNull(),
  careType: careTypeEnum("care_type").notNull(), // --> Recommendation: Use pgEnum
  status: reminderStatusEnum("status").notNull().default("pending"), // --> Recommendation: Use pgEnum
  recurring: boolean("recurring").notNull().default(false),
  recurringInterval: integer("recurring_interval"),
  notified: boolean("notified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
}).extend({
  dueDate: z.string(),
  plantId: z.number().int(),
  message: z.string().optional().default(""),
});

// Community Tips schema
export const communityTips = pgTable("community_tips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  plantType: text("plant_type").notNull(),
  scientificName: text("scientific_name"),
  careCategory: careCategoryEnum("care_category").notNull(), // --> Recommendation: Use pgEnum
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  status: tipStatusEnum("status").default("active"), // --> Recommendation: Use pgEnum
  featured: boolean("featured").default(false),
  likesCount: integer("likes_count").default(0),
});

export const insertCommunityTipSchema = createInsertSchema(communityTips).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  featured: true,
  likesCount: true,
});

// Tip Votes schema
export const tipVotes = pgTable("tip_votes", {
  id: serial("id").primaryKey(),
  tipId: integer("tip_id").notNull(),
  userId: integer("user_id").notNull(),
  vote: integer("vote").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTipVoteSchema = createInsertSchema(tipVotes).omit({
  id: true,
  createdAt: true,
});

// Photos schema
export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  plant_id: integer("plant_id").references(() => plants.id, {
    onDelete: "cascade",
  }),
});

// Shared plant links schema
export const sharedPlantLinks = pgTable("shared_plant_links", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").notNull().references(() => plants.id, {
    onDelete: "cascade",
  }),
  userId: integer("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  shareId: text("share_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  lastAccessed: timestamp("last_accessed"),
  viewCount: integer("view_count").default(0),
  active: boolean("active").default(true),
});

export const insertSharedPlantLinkSchema = createInsertSchema(sharedPlantLinks).omit({
  id: true,
  createdAt: true,
  lastAccessed: true,
  viewCount: true,
});

// Shared care log links schema
export const sharedCareLogLinks = pgTable("shared_care_log_links", {
  id: serial("id").primaryKey(),
  careLogId: integer("care_log_id").notNull().references(() => careLogs.id, {
    onDelete: "cascade",
  }),
  userId: integer("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  shareId: text("share_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  lastAccessed: timestamp("last_accessed"),
  viewCount: integer("view_count").default(0),
  active: boolean("active").default(true),
});

export const insertSharedCareLogLinkSchema = createInsertSchema(sharedCareLogLinks).omit({
  id: true,
  createdAt: true,
  lastAccessed: true,
  viewCount: true,
});

// User Follow System
export const userFollows = pgTable("user_follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  followedId: integer("followed_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserFollowSchema = createInsertSchema(userFollows).omit({
  id: true,
  createdAt: true,
});

// Activity Feed System
export const activityFeed = pgTable("activity_feed", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  activityType: activityTypeEnum("activity_type").notNull(), // --> Recommendation: Use pgEnum
  entityId: integer("entity_id"),
  entityType: text("entity_type"),
  metadata: jsonb("metadata"), // --> Recommendation: Use jsonb
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityFeedSchema = createInsertSchema(activityFeed).omit({
  id: true,
  createdAt: true,
});

// Profile and Collection Visibility Settings
export const profileSettings = pgTable("profile_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }).unique(),
  isProfilePublic: boolean("is_profile_public").default(false),
  isCollectionPublic: boolean("is_collection_public").default(false),
  showActivityInFeed: boolean("show_activity_in_feed").default(true),
  allowFollowers: boolean("allow_followers").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProfileSettingsSchema = createInsertSchema(profileSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});


// ===== Types and Constants for Frontend Use =====

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Plant = typeof plants.$inferSelect;
export type InsertPlant = z.infer<typeof insertPlantSchema>;
export type CareLog = typeof careLogs.$inferSelect;
export type InsertCareLog = z.infer<typeof insertCareLogSchema>;
export type PlantGuide = typeof plantGuides.$inferSelect;
export type InsertPlantGuide = z.infer<typeof insertPlantGuideSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type CommunityTip = typeof communityTips.$inferSelect;
export type InsertCommunityTip = z.infer<typeof insertCommunityTipSchema>;
export type TipVote = typeof tipVotes.$inferSelect;
export type InsertTipVote = z.infer<typeof insertTipVoteSchema>;
export type SharedPlantLink = typeof sharedPlantLinks.$inferSelect;
export type InsertSharedPlantLink = z.infer<typeof insertSharedPlantLinkSchema>;
export type SharedCareLogLink = typeof sharedCareLogLinks.$inferSelect;
export type InsertSharedCareLogLink = z.infer<typeof insertSharedCareLogLinkSchema>;
export type UserFollow = typeof userFollows.$inferSelect;
export type InsertUserFollow = z.infer<typeof insertUserFollowSchema>;
export type ActivityFeed = typeof activityFeed.$inferSelect;
export type InsertActivityFeed = z.infer<typeof insertActivityFeedSchema>;
export type ProfileSettings = typeof profileSettings.$inferSelect;
export type InsertProfileSettings = z.infer<typeof insertProfileSettingsSchema>;

// Extended types
export type PlantWithCare = Plant & {
  nextWatering: Date | null;
  nextFertilizing: Date | null;
  guide?: PlantGuide;
};
export type CommunityTipWithUser = CommunityTip & {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  userHasLiked?: boolean;
};

// --> Recommendation: Export enum values from the pgEnum definitions for use in the frontend.
export const SUNLIGHT_LEVELS = sunlightLevelEnum.enumValues;
export const CARE_TYPES = careTypeEnum.enumValues;
export const PLANT_STATUSES = plantStatusEnum.enumValues;
export const REMINDER_STATUSES = reminderStatusEnum.enumValues;
export const CARE_CATEGORIES = careCategoryEnum.enumValues;
export const TIP_STATUSES = tipStatusEnum.enumValues;
export const ACTIVITY_TYPES = activityTypeEnum.enumValues;