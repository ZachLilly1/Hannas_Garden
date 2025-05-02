import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as logger from './services/logger';

// Set WebSocket constructor for Neon serverless
neonConfig.webSocketConstructor = ws;

// Ensure database URL is provided
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure production-optimized connection pool
const isProduction = process.env.NODE_ENV === 'production';

// Define pool configuration with proper production settings
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Maximum number of clients the pool should contain
  // Lower in development for reduced resource usage, higher in production for performance
  max: isProduction ? 20 : 5,
  // Maximum time in milliseconds a client can be idle before being closed
  idleTimeoutMillis: isProduction ? 30000 : 10000,
  // Maximum time in milliseconds to wait for a connection to become available
  connectionTimeoutMillis: 5000,
  // Implement basic health checks
  statement_timeout: 60000, // 60 seconds max query time
};

// Create connection pool with optimized settings
export const pool = new Pool(poolConfig);

// Add error handling to the pool
pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
  
  // In extreme cases, the pool may need to be recreated
  if (err.message.includes('connection terminated unexpectedly')) {
    logger.warn('Database connection terminated unexpectedly. Consider restarting the application if issues persist.');
  }
});

// Create Drizzle ORM instance with the connection pool
export const db = drizzle({ client: pool, schema });

// Log when database is ready
logger.info(`Database connection pool initialized (${isProduction ? 'production' : 'development'} mode)`);

// Graceful shutdown function to be called on application termination
export async function closeDbConnection() {
  try {
    logger.info('Closing database connection pool...');
    await pool.end();
    logger.info('Database connection pool closed successfully');
  } catch (error) {
    logger.error('Error closing database connection pool:', error);
  }
}
