/**
 * Create a test user with a bcrypt password for testing
 */

import { execSync } from 'child_process';

// Generate a bcrypt hash using the bcrypt library directly via CLI
function generateBcryptHash(password) {
  const hashCommand = `node -e "const bcrypt = require('bcrypt'); bcrypt.hash('${password}', 10).then(hash => console.log(hash));"`;
  return execSync(hashCommand).toString().trim();
}

// Create SQL to insert or update user with bcrypt password
function createSqlCommand(username, email, bcryptHash) {
  return `
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE username = '${username}') THEN
    UPDATE users SET password = '${bcryptHash}' WHERE username = '${username}';
  ELSE
    INSERT INTO users (username, email, password, created_at, updated_at, display_name)
    VALUES ('${username}', '${email}', '${bcryptHash}', NOW(), NOW(), 'BCrypt Test User');
  END IF;
END $$;

SELECT id, username FROM users WHERE username = '${username}';
  `;
}

// Main function
async function main() {
  try {
    const username = 'bcryptuser';
    const password = 'test123';
    const email = 'bcryptuser@example.com';
    
    console.log(`Generating bcrypt hash for password: ${password}`);
    const bcryptHash = generateBcryptHash(password);
    console.log(`Generated bcrypt hash: ${bcryptHash}`);
    
    const sqlCommand = createSqlCommand(username, email, bcryptHash);
    console.log('Executing SQL:');
    console.log(sqlCommand);
    
    // Execute SQL using DATABASE_URL from environment
    const result = execSync(`psql "$DATABASE_URL" -c "${sqlCommand.replace(/"/g, '\\"')}"`).toString();
    console.log(result);
    
    console.log(`Test user created/updated successfully.`);
    console.log(`\nTest credentials:`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

main();