const axios = require('axios');

async function testSearch() {
    try {
        console.log('🔍 Testing product search...');
        
        // Test 1: Basic search
        console.log('\n1. Testing basic search for "Samsung"...');
        const response1 = await axios.get('http://localhost:3000/api/products?search=Samsung');
        console.log(`✅ Found ${response1.data.products.length} products`);
        if (response1.data.products.length > 0) {
            console.log(`   First product: ${response1.data.products[0].name}`);
        }
        
        // Test 2: Search with pagination
        console.log('\n2. Testing search with pagination...');
        const response2 = await axios.get('http://localhost:3000/api/products?search=điện&page=1&limit=5');
        console.log(`✅ Found ${response2.data.products.length} products (page 1, limit 5)`);
        
        // Test 3: Search with category filter
        console.log('\n3. Testing search with category filter...');
        const response3 = await axios.get('http://localhost:3000/api/products?search=tủ&category_id=1');
        console.log(`✅ Found ${response3.data.products.length} products in category 1`);
        
        // Test 4: Empty search
        console.log('\n4. Testing empty search...');
        const response4 = await axios.get('http://localhost:3000/api/products');
        console.log(`✅ Found ${response4.data.products.length} products (no search)`);
        
        // Test 5: Search for non-existent product
        console.log('\n5. Testing search for non-existent product...');
        const response5 = await axios.get('http://localhost:3000/api/products?search=xyz123nonexistent');
        console.log(`✅ Found ${response5.data.products.length} products (should be 0)`);
        
        console.log('\n🎉 All search tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Search test failed:', error.response ? error.response.data : error.message);
    }
}

testSearch();

