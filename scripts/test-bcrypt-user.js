/**
 * This script creates a test user with a bcrypt password hash to verify our authentication fix
 * 
 * Usage: node scripts/test-bcrypt-user.js
 */

import bcrypt from 'bcrypt';
import { pool } from '../server/db.js';

// Constants for test user
const TEST_USERNAME = 'bcryptuser';
const TEST_PASSWORD = 'test123'; // This will be hashed with bcrypt
const TEST_EMAIL = 'bcryptuser@example.com';

async function createBcryptTestUser() {
  console.log(`Creating test user "${TEST_USERNAME}" with bcrypt password...`);
  
  try {
    // Generate a bcrypt hash (10 rounds is standard for bcrypt)
    const bcryptHash = await bcrypt.hash(TEST_PASSWORD, 10);
    console.log(`Generated bcrypt hash: ${bcryptHash}`);

    // Check if user already exists
    const checkResult = await pool.query('SELECT id FROM users WHERE username = $1', [TEST_USERNAME]);
    
    if (checkResult.rows.length > 0) {
      const userId = checkResult.rows[0].id;
      console.log(`User already exists with ID ${userId}. Updating password to bcrypt...`);
      
      // Update existing user with bcrypt password
      await pool.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [bcryptHash, userId]
      );
      
      console.log(`Updated user ${TEST_USERNAME} with ID ${userId} to use bcrypt password`);
    } else {
      // Create new user with bcrypt password
      const result = await pool.query(
        `INSERT INTO users 
          (username, email, password, created_at, updated_at, display_name) 
         VALUES 
          ($1, $2, $3, NOW(), NOW(), $4) 
         RETURNING id`,
        [TEST_USERNAME, TEST_EMAIL, bcryptHash, 'BCrypt Test User']
      );
      
      const userId = result.rows[0].id;
      console.log(`Created new test user ${TEST_USERNAME} with ID ${userId} using bcrypt password`);
    }

    console.log(`Test credentials: username=${TEST_USERNAME}, password=${TEST_PASSWORD}`);
    console.log('You can now test logging in with these credentials');
    
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the function
createBcryptTestUser();