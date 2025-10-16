const axios = require('axios');

async function testRegistration() {
    console.log('🧪 Testing user registration...');
    
    const testUser = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '0123456789'
    };

    try {
        console.log('📤 Sending registration request...');
        console.log('User data:', testUser);
        
        const response = await axios.post('http://localhost:3000/api/auth/register', testUser);
        
        console.log('✅ Registration successful!');
        console.log('📋 Response:', {
            status: response.status,
            message: response.data.message,
            userId: response.data.user?.id,
            email: response.data.user?.email
        });
        
    } catch (error) {
        console.error('❌ Registration failed!');
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Message:', error.response.data?.message);
            console.error('Full response:', error.response.data);
        } else if (error.request) {
            console.error('No response received. Is the server running?');
            console.error('Request details:', error.request);
        } else {
            console.error('Error setting up request:', error.message);
        }
    }
}

testRegistration();