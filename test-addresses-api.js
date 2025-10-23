const axios = require('axios');

async function testAddressesAPI() {
  try {
    console.log('🧪 Testing Addresses API...');
    
    // First, login to get a token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test@example.com',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Test get addresses
    const addressesResponse = await axios.get('http://localhost:3000/api/user/addresses', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📋 Addresses API Response:');
    console.log(JSON.stringify(addressesResponse.data, null, 2));
    
    // Check if addresses are properly formatted
    const addresses = addressesResponse.data.addresses;
    if (addresses && addresses.length > 0) {
      console.log('\n✅ Addresses found:');
      addresses.forEach((addr, index) => {
        console.log(`   ${index + 1}. ${addr.recipient_name || 'No name'}`);
        console.log(`      Phone: ${addr.phone || 'No phone'}`);
        console.log(`      Address: ${addr.address_line1 || 'No address'}`);
        console.log(`      City: ${addr.city || 'No city'}, ${addr.state || 'No state'}`);
        console.log(`      Default: ${addr.is_default ? 'Yes' : 'No'}`);
        console.log('');
      });
    } else {
      console.log('❌ No addresses found');
    }
    
  } catch (error) {
    console.error('❌ Error testing addresses API:', error.response?.data || error.message);
  }
}

// Run the test
if (require.main === module) {
  testAddressesAPI();
}

module.exports = { testAddressesAPI };
