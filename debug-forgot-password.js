const axios = require('axios');

async function debugForgotPassword() {
  try {
    console.log('🔍 Debugging Forgot Password...');
    
    // Step 1: Request OTP
    console.log('\n📧 Step 1: Requesting OTP...');
    const forgotResponse = await axios.post('http://localhost:3000/api/auth/forgot-password', {
      email: 'test@example.com'
    });
    
    console.log('✅ OTP request successful:', forgotResponse.data);
    const otp = forgotResponse.data.otp;
    console.log(`🔑 OTP received: ${otp}`);
    
    // Step 2: Test reset password with detailed error
    console.log('\n🔐 Step 2: Testing reset password...');
    try {
      const resetResponse = await axios.post('http://localhost:3000/api/auth/reset-password', {
        email: 'test@example.com',
        otp: otp,
        newPassword: 'newpassword123'
      });
      
      console.log('✅ Password reset successful:', resetResponse.data);
      
    } catch (error) {
      console.log('❌ Reset password failed:');
      console.log('Status:', error.response?.status);
      console.log('Data:', error.response?.data);
      console.log('Message:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the debug
if (require.main === module) {
  debugForgotPassword();
}

module.exports = { debugForgotPassword };
