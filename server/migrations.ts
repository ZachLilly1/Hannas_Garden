import { Pool } from '@neondatabase/serverless';
import { db } from './db';
import { users } from '../shared/schema';
import { sql } from 'drizzle-orm';

/**
 * This script adds the missing columns to support our new features
 */
export async function applyMigrations() {
  try {
    console.log('Starting database migrations...');
    
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
    console.log('Added onboarding_completed column (if needed)');

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
    console.log('Added prefers_dark_mode column (if needed)');

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
    console.log('Added view_preference column (if needed)');

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
    console.log('Added weather_location column (if needed)');

    // Create the session table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid")
      );
    `);
    console.log('Created session table (if needed)');

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
    console.log('Created session table index (if needed)');

    console.log('Database migrations completed successfully!');
  } catch (error) {
    console.error('Error applying migrations:', error);
    throw error;
  }
}