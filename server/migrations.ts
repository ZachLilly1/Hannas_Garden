import { Pool } from '@neondatabase/serverless';
import { db } from './db';
import { users } from '../shared/schema';
import { sql } from 'drizzle-orm';
import * as logger from './services/logger';

/**
 * This script adds the missing columns to support our new features
 */
export async function applyMigrations() {
  try {
    logger.info('Starting database migrations...');
    
    // Add onboarding_completed column if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'onboarding_completed'
        ) THEN 
          ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `);
    logger.info('Added onboarding_completed column (if needed)');

    // Add prefers_dark_mode column if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'prefers_dark_mode'
        ) THEN 
          ALTER TABLE users ADD COLUMN prefers_dark_mode BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `);
    logger.info('Added prefers_dark_mode column (if needed)');

    // Add view_preference column if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'view_preference'
        ) THEN 
          ALTER TABLE users ADD COLUMN view_preference TEXT DEFAULT 'list';
        END IF;
      END $$;
    `);
    logger.info('Added view_preference column (if needed)');

    // Add weather_location column if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'weather_location'
        ) THEN 
          ALTER TABLE users ADD COLUMN weather_location TEXT;
        END IF;
      END $$;
    `);
    logger.info('Added weather_location column (if needed)');

    // Add bio column if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'bio'
        ) THEN 
          ALTER TABLE users ADD COLUMN bio TEXT;
        END IF;
      END $$;
    `);
    logger.info('Added bio column (if needed)');

    // Create the session table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid")
      );
    `);
    logger.info('Created session table (if needed)');

    // Create index on session table if it doesn't exist
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_user_sessions_expire'
        ) THEN
          CREATE INDEX "IDX_user_sessions_expire" ON "user_sessions" ("expire");
        END IF;
      END $$;
    `);
    logger.info('Created session table index (if needed)');
    
    // Add metadata column to care_logs table if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'care_logs' AND column_name = 'metadata'
        ) THEN 
          ALTER TABLE care_logs ADD COLUMN metadata TEXT;
        END IF;
      END $$;
    `);
    logger.info('Added metadata column to care_logs table (if needed)');

    // Add scientific_name column to plants table if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'plants' AND column_name = 'scientific_name'
        ) THEN 
          ALTER TABLE plants ADD COLUMN scientific_name TEXT;
        END IF;
      END $$;
    `);
    logger.info('Added scientific_name column to plants table (if needed)');

    // Make plant type optional if it's currently required
    await db.execute(sql`
      DO $$ 
      BEGIN 
        -- Check if the column exists
        IF EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'plants' AND column_name = 'type'
        ) THEN 
          -- Try to modify constraint (will error if no constraint exists, but that's ok)
          BEGIN
            -- Drop NOT NULL constraint
            ALTER TABLE plants ALTER COLUMN type DROP NOT NULL;
            -- Set default value for existing null values
            UPDATE plants SET type = 'identified' WHERE type IS NULL;
          EXCEPTION WHEN OTHERS THEN
            NULL; -- Do nothing if fails (likely no constraint existed)
          END;
        END IF;
      END $$;
    `);
    logger.info('Made plant type optional (if needed)');

    // Add common_name and category columns to plant_guides table and convert from plant_type to scientific_name
    await db.execute(sql`
      DO $$ 
      BEGIN 
        -- Add common_name if it doesn't exist
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'plant_guides' AND column_name = 'common_name'
        ) THEN 
          ALTER TABLE plant_guides ADD COLUMN common_name TEXT;
          -- Initialize with existing plant_type as fallback
          UPDATE plant_guides SET common_name = plant_type WHERE common_name IS NULL;
          -- Make it not null after populating
          ALTER TABLE plant_guides ALTER COLUMN common_name SET NOT NULL;
        END IF;

        -- Add category if it doesn't exist
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'plant_guides' AND column_name = 'category'
        ) THEN 
          ALTER TABLE plant_guides ADD COLUMN category TEXT;
          -- Initialize with plant_type as the category
          UPDATE plant_guides SET category = plant_type WHERE category IS NULL;
        END IF;

        -- Add scientific_name if it doesn't exist
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'plant_guides' AND column_name = 'scientific_name'
        ) THEN 
          ALTER TABLE plant_guides ADD COLUMN scientific_name TEXT;
          -- Initialize with plant_type as a temporary value since we don't have real scientific names yet
          UPDATE plant_guides SET scientific_name = plant_type WHERE scientific_name IS NULL;
          -- Create a unique constraint
          BEGIN
            ALTER TABLE plant_guides ADD CONSTRAINT unique_scientific_name UNIQUE (scientific_name);
          EXCEPTION WHEN OTHERS THEN
            NULL; -- Do nothing if fails (constraint might already exist)
          END;
        END IF;
      END $$;
    `);
    logger.info('Updated plant_guides table structure (if needed)');

    // Create the shared_plant_links table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "shared_plant_links" (
        "id" SERIAL PRIMARY KEY,
        "plant_id" INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
        "user_id" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "share_id" TEXT NOT NULL UNIQUE,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "last_accessed" TIMESTAMP,
        "view_count" INTEGER DEFAULT 0,
        "active" BOOLEAN DEFAULT TRUE
      );
    `);
    logger.info('Created shared_plant_links table (if needed)');

    // Create index on share_id for faster lookups
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shared_plant_links_share_id'
        ) THEN
          CREATE INDEX "idx_shared_plant_links_share_id" ON "shared_plant_links" ("share_id");
        END IF;
      END $$;
    `);
    logger.info('Created shared_plant_links index (if needed)');

    logger.info('Database migrations completed successfully!');
  } catch (error) {
    logger.error('Error applying migrations:', error);
    throw error;
  }
}