const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing backend API connectivity...');
    
    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:5003/api/health');
    console.log('✅ Health check passed:', healthResponse.data);
    
    // Test registration endpoint
    const testUser = {
      registrationNumber: 'TEST123',
      password: 'TestPass123!',
      role: 'student',
      year: '2024',
      semester: '1',
      course: 'Computer Science'
    };
    
    console.log('Testing registration...');
    const registerResponse = await axios.post('http://localhost:5003/api/auth/register', testUser);
    console.log('✅ Registration successful:', registerResponse.data);
    
    // Test login endpoint
    console.log('Testing login...');
    const loginResponse = await axios.post('http://localhost:5003/api/auth/login', {
      registrationNumber: testUser.registrationNumber,
      password: testUser.password
    });
    console.log('✅ Login successful:', loginResponse.data);
    
    console.log('\n🎉 All API tests passed! Backend is working correctly.');
    
  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
  }
}

testAPI();
