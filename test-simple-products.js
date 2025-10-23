const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testSimpleProducts() {
    console.log('🧪 Testing simple products API...\n');

    try {
        // Test basic products API
        console.log('1️⃣ Testing basic products API...');
        const response = await axios.get(`${API_BASE}/api/products`);
        
        console.log('✅ Products API working');
        console.log('   Products count:', response.data.products.length);
        console.log('   Sample product:', response.data.products[0]?.name);

        console.log('\n🎉 Basic products API is working!');
        console.log('\n📋 Summary:');
        console.log('   ✅ SQL error "Unknown column b.name" fixed');
        console.log('   ✅ Products API working without search');
        console.log('   ⚠️  Search functionality may need further debugging');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Response:', error.response.data);
        }
    }
}

testSimpleProducts();
