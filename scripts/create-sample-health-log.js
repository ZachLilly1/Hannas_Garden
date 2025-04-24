/**
 * This script creates a sample health check care log with diagnosis data.
 * It's for demonstration purposes to show the health diagnosis display.
 * 
 * Usage: node scripts/create-sample-health-log.js
 */
import { db } from '../server/db.js';
import { careLogs } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

// Sample health diagnosis data
const sampleDiagnosis = {
  issue: "Leaf Yellowing with Brown Spots",
  cause: "The yellowing leaves with brown spots indicate a fungal infection, likely caused by overwatering and poor air circulation around the plant.",
  solution: "Trim affected leaves with clean, sterilized scissors. Reduce watering frequency and ensure the soil dries between waterings. Improve air circulation around the plant and avoid wetting the leaves when watering.",
  preventionTips: [
    "Water at the base of the plant, not from above",
    "Ensure proper drainage in the pot",
    "Maintain good air circulation around plants",
    "Clean gardening tools between uses to prevent spreading infection"
  ],
  severity: "medium",
  confidenceLevel: "high"
};

// Check if a plant ID was provided as an argument
const plantId = process.argv[2] ? parseInt(process.argv[2], 10) : 1;

async function createSampleHealthLog() {
  try {
    // Create the care log
    const result = await db
      .insert(careLogs)
      .values({
        plantId,
        careType: 'health_check',
        notes: 'Sample health check with diagnosis data for demonstration',
        timestamp: new Date().toISOString(),
        metadata: JSON.stringify({ healthDiagnosis: sampleDiagnosis })
      })
      .returning();

    console.log(`Successfully created sample health check log with ID ${result[0].id}`);
    console.log('Health diagnosis data:', sampleDiagnosis);
  } catch (error) {
    console.error('Error creating sample health log:', error);
  }
}

createSampleHealthLog();