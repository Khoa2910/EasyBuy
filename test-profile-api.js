// Test script for Profile API endpoints
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Test data
const testUser = {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
};

async function testProfileAPI() {
    console.log('🧪 Testing Profile API endpoints...\n');

    try {
        // 1. Register a test user
        console.log('1. Registering test user...');
        const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUser);
        console.log('✅ User registered:', registerResponse.data.user.email);
        
        const accessToken = registerResponse.data.accessToken;
        const headers = { Authorization: `Bearer ${accessToken}` };

        // 2. Get user profile
        console.log('\n2. Getting user profile...');
        const profileResponse = await axios.get(`${API_BASE_URL}/user/profile`, { headers });
        console.log('✅ Profile loaded:', profileResponse.data);

        // 3. Update user profile
        console.log('\n3. Updating user profile...');
        const updateData = {
            firstName: 'Updated',
            lastName: 'Name',
            phone: '0123456789',
            dateOfBirth: '1990-01-01',
            gender: 'male'
        };
        const updateResponse = await axios.put(`${API_BASE_URL}/user/profile`, updateData, { headers });
        console.log('✅ Profile updated:', updateResponse.data);

        // 4. Add user address
        console.log('\n4. Adding user address...');
        const addressData = {
            type: 'home',
            recipientName: 'Test User',
            phone: '0123456789',
            addressLine1: '123 Test Street',
            addressLine2: 'Apt 1',
            city: 'Ho Chi Minh',
            state: 'Ho Chi Minh',
            postalCode: '700000',
            country: 'Vietnam',
            isDefault: true
        };
        const addressResponse = await axios.post(`${API_BASE_URL}/user/addresses`, addressData, { headers });
        console.log('✅ Address added:', addressResponse.data);

        // 5. Get user addresses
        console.log('\n5. Getting user addresses...');
        const addressesResponse = await axios.get(`${API_BASE_URL}/user/addresses`, { headers });
        console.log('✅ Addresses loaded:', addressesResponse.data);

        // 6. Update address
        console.log('\n6. Updating address...');
        const addressId = addressesResponse.data.addresses[0].id;
        const updateAddressData = {
            ...addressData,
            addressLine1: '456 Updated Street'
        };
        const updateAddressResponse = await axios.put(`${API_BASE_URL}/user/addresses/${addressId}`, updateAddressData, { headers });
        console.log('✅ Address updated:', updateAddressResponse.data);

        // 7. Delete address
        console.log('\n7. Deleting address...');
        const deleteResponse = await axios.delete(`${API_BASE_URL}/user/addresses/${addressId}`, { headers });
        console.log('✅ Address deleted:', deleteResponse.data);

        console.log('\n🎉 All tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run tests
testProfileAPI();

