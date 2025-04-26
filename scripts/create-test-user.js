// Modify this file to use ES Modules
import { hashPassword } from '../server/auth.js';
import { pool } from '../server/db.js';

async function createTestUser() {
  try {
    // Hash password for test user
    const password = 'garden123';
    const hashedPassword = await hashPassword(password);
    
    // Insert test user into database
    const query = `
      INSERT INTO users 
        (username, email, password, display_name, preferred_units, timezone, notifications_enabled) 
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (username) 
      DO UPDATE SET 
        password = $3,
        display_name = $4
      RETURNING id, username, email, display_name;
    `;
    
    const values = [
      'testgarden', 
      'test@garden.app', 
      hashedPassword, 
      'Test Garden User',
      'metric',
      'UTC',
      true
    ];
    
    const result = await pool.query(query, values);
    
    console.log('Test user created/updated successfully:');
    console.log(result.rows[0]);
    console.log('\nLogin credentials:');
    console.log('Username: testgarden');
    console.log('Password: garden123');
    
    // Close the database connection
    await pool.end();
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();