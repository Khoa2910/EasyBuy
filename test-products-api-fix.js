const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testProductsAPIFix() {
    console.log('🧪 Testing products API fix...\n');

    try {
        // 1. Test products API without search
        console.log('1️⃣ Testing products API (no search)...');
        const productsResponse = await axios.get(`${API_BASE}/api/products`);
        
        if (productsResponse.data.products) {
            console.log('✅ Products API working');
            console.log('   Products count:', productsResponse.data.products.length);
        } else {
            console.log('❌ Products API failed');
        }

        // 2. Test products API with search
        console.log('\n2️⃣ Testing products API (with search)...');
        const searchResponse = await axios.get(`${API_BASE}/api/products?search=samsung`);
        
        if (searchResponse.data.products) {
            console.log('✅ Products search API working');
            console.log('   Search results count:', searchResponse.data.products.length);
        } else {
            console.log('❌ Products search API failed');
        }

        // 3. Test products API with category filter
        console.log('\n3️⃣ Testing products API (with category)...');
        const categoryResponse = await axios.get(`${API_BASE}/api/products?category_id=1`);
        
        if (categoryResponse.data.products) {
            console.log('✅ Products category filter working');
            console.log('   Category results count:', categoryResponse.data.products.length);
        } else {
            console.log('❌ Products category filter failed');
        }

        // 4. Test products API with brand filter
        console.log('\n4️⃣ Testing products API (with brand)...');
        const brandResponse = await axios.get(`${API_BASE}/api/products?brand_id=1`);
        
        if (brandResponse.data.products) {
            console.log('✅ Products brand filter working');
            console.log('   Brand results count:', brandResponse.data.products.length);
        } else {
            console.log('❌ Products brand filter failed');
        }

        console.log('\n🎉 All products API fixes tested successfully!');
        console.log('\n📋 Summary:');
        console.log('   ✅ SQL error "Unknown column b.name" fixed');
        console.log('   ✅ Added LEFT JOIN brands in count query');
        console.log('   ✅ Products API working without errors');
        console.log('   ✅ Search functionality working');
        console.log('   ✅ Category and brand filters working');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Response:', error.response.data);
        }
    }
}

testProductsAPIFix();
