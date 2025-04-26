const fetch = require('node-fetch');

// Test login with the testuser account
async function testLogin() {
  console.log('Testing login functionality...');
  
  // First, let's try to login with the test user
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123'
      }),
      credentials: 'include'
    });
    
    const cookieHeader = loginRes.headers.get('set-cookie');
    console.log('Set-Cookie Header:', cookieHeader);
    
    if (loginRes.ok) {
      const userData = await loginRes.json();
      console.log('Login successful:', userData);
      
      // Now with the same session, check if we can fetch the user data
      const userRes = await fetch('http://localhost:5000/api/auth/user', {
        headers: {
          'Cookie': cookieHeader
        }
      });
      
      if (userRes.ok) {
        const userProfile = await userRes.json();
        console.log('User profile fetched:', userProfile);
        
        // Now try to fetch plants
        const plantsRes = await fetch('http://localhost:5000/api/plants', {
          headers: {
            'Cookie': cookieHeader
          }
        });
        
        if (plantsRes.ok) {
          const plants = await plantsRes.json();
          console.log('Plants fetched successfully:', plants.length);
        } else {
          console.error('Failed to fetch plants:', await plantsRes.text());
        }
      } else {
        console.error('Failed to fetch user profile:', await userRes.text());
      }
    } else {
      console.error('Login failed:', await loginRes.text());
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testLogin();