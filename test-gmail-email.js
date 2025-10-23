const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testGmailEmail() {
  console.log('📧 Testing Gmail Email Sending...');
  console.log('=================================');

  try {
    // Test forgot password với email thật
    console.log('\n📧 Testing forgot password with real Gmail...');
    const response = await axios.post(`${BASE_URL}/api/auth/forgot-password`, {
      email: 'dangkhoa29102k2@gmail.com'
    });

    console.log('✅ Response:', response.data);
    
    if (response.data.success) {
      console.log('\n🎉 SUCCESS! Email should be sent to your Gmail!');
      console.log('📧 Check your email: dangkhoa29102k2@gmail.com');
      console.log('📧 OTP Code:', response.data.otp);
      console.log('\n💡 If you received the email, Gmail configuration is working!');
    } else {
      console.log('❌ Failed to send email');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testGmailEmail();
