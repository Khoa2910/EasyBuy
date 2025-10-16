const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Test user credentials
const testUser = {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
};

let authToken = '';

async function testAuth() {
    console.log('🔐 Testing Authentication...');
    
    try {
        // Register user
        console.log('  📝 Registering user...');
        const registerResponse = await axios.post(`${API_BASE}/auth/register`, testUser);
        console.log('  ✅ Register successful:', registerResponse.data.message);
    } catch (error) {
        if (error.response?.status === 400 && error.response.data.message.includes('already exists')) {
            console.log('  ℹ️  User already exists, continuing...');
        } else {
            console.log('  ❌ Register failed:', error.response?.data?.message || error.message);
        }
    }

    try {
        // Login user
        console.log('  🔑 Logging in...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        
        if (loginResponse.data.success) {
            authToken = loginResponse.data.token;
            console.log('  ✅ Login successful');
        } else {
            throw new Error('Login failed');
        }
    } catch (error) {
        console.log('  ❌ Login failed:', error.response?.data?.message || error.message);
        throw error;
    }
}

async function testCart() {
    console.log('\n🛒 Testing Cart Management...');
    
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };

    try {
        // Get empty cart
        console.log('  📋 Getting empty cart...');
        const getCartResponse = await axios.get(`${API_BASE}/cart`, { headers });
        console.log('  ✅ Cart retrieved:', getCartResponse.data.itemCount, 'items');

        // Add item to cart
        console.log('  ➕ Adding item to cart...');
        const addToCartResponse = await axios.post(`${API_BASE}/cart/add`, {
            productId: 1,
            quantity: 2
        }, { headers });
        console.log('  ✅ Item added to cart:', addToCartResponse.data.message);

        // Get cart with items
        console.log('  📋 Getting cart with items...');
        const getCartWithItemsResponse = await axios.get(`${API_BASE}/cart`, { headers });
        console.log('  ✅ Cart retrieved:', getCartWithItemsResponse.data.itemCount, 'items');
        console.log('  💰 Subtotal:', getCartWithItemsResponse.data.subtotal);

        // Update item quantity
        console.log('  ✏️  Updating item quantity...');
        const itemId = getCartWithItemsResponse.data.items[0].id;
        const updateResponse = await axios.put(`${API_BASE}/cart/update/${itemId}`, {
            quantity: 3
        }, { headers });
        console.log('  ✅ Item quantity updated:', updateResponse.data.message);

        // Remove item from cart
        console.log('  🗑️  Removing item from cart...');
        const removeResponse = await axios.delete(`${API_BASE}/cart/remove/${itemId}`, { headers });
        console.log('  ✅ Item removed from cart:', removeResponse.data.message);

        // Get final cart
        console.log('  📋 Getting final cart...');
        const finalCartResponse = await axios.get(`${API_BASE}/cart`, { headers });
        console.log('  ✅ Final cart:', finalCartResponse.data.itemCount, 'items');

    } catch (error) {
        console.log('  ❌ Cart test failed:', error.response?.data?.message || error.message);
    }
}

async function testWishlist() {
    console.log('\n❤️  Testing Wishlist Management...');
    
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };

    try {
        // Get empty wishlist
        console.log('  📋 Getting empty wishlist...');
        const getWishlistResponse = await axios.get(`${API_BASE}/wishlist`, { headers });
        console.log('  ✅ Wishlist retrieved:', getWishlistResponse.data.itemCount, 'items');

        // Add item to wishlist
        console.log('  ➕ Adding item to wishlist...');
        const addToWishlistResponse = await axios.post(`${API_BASE}/wishlist`, {
            productId: 1
        }, { headers });
        console.log('  ✅ Item added to wishlist:', addToWishlistResponse.data.message);

        // Add another item
        console.log('  ➕ Adding another item to wishlist...');
        const addAnotherResponse = await axios.post(`${API_BASE}/wishlist`, {
            productId: 2
        }, { headers });
        console.log('  ✅ Another item added to wishlist:', addAnotherResponse.data.message);

        // Get wishlist with items
        console.log('  📋 Getting wishlist with items...');
        const getWishlistWithItemsResponse = await axios.get(`${API_BASE}/wishlist`, { headers });
        console.log('  ✅ Wishlist retrieved:', getWishlistWithItemsResponse.data.itemCount, 'items');

        // Check if item is in wishlist
        console.log('  🔍 Checking if item is in wishlist...');
        const checkResponse = await axios.get(`${API_BASE}/wishlist/check/1`, { headers });
        console.log('  ✅ Item 1 in wishlist:', checkResponse.data.inWishlist);

        // Remove item from wishlist
        console.log('  🗑️  Removing item from wishlist...');
        const removeResponse = await axios.delete(`${API_BASE}/wishlist/1`, { headers });
        console.log('  ✅ Item removed from wishlist:', removeResponse.data.message);

        // Get final wishlist
        console.log('  📋 Getting final wishlist...');
        const finalWishlistResponse = await axios.get(`${API_BASE}/wishlist`, { headers });
        console.log('  ✅ Final wishlist:', finalWishlistResponse.data.itemCount, 'items');

    } catch (error) {
        console.log('  ❌ Wishlist test failed:', error.response?.data?.message || error.message);
    }
}

async function testErrorHandling() {
    console.log('\n🚨 Testing Error Handling...');
    
    try {
        // Test without authentication
        console.log('  🔒 Testing without authentication...');
        try {
            await axios.get(`${API_BASE}/cart`);
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('  ✅ Unauthorized access properly blocked');
            } else {
                console.log('  ❌ Unexpected error:', error.response?.data?.message);
            }
        }

        // Test invalid product ID
        console.log('  🚫 Testing invalid product ID...');
        try {
            await axios.post(`${API_BASE}/cart/add`, {
                productId: 99999,
                quantity: 1
            }, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('  ✅ Invalid product ID properly handled');
            } else {
                console.log('  ❌ Unexpected error:', error.response?.data?.message);
            }
        }

    } catch (error) {
        console.log('  ❌ Error handling test failed:', error.message);
    }
}

async function runTests() {
    console.log('🚀 Starting Cart & Wishlist Tests...\n');
    
    try {
        await testAuth();
        await testCart();
        await testWishlist();
        await testErrorHandling();
        
        console.log('\n🎉 All tests completed!');
    } catch (error) {
        console.log('\n💥 Test suite failed:', error.message);
        process.exit(1);
    }
}

// Run tests
runTests();













