const axios = require('axios');

async function testForgotPassword() {
  try {
    console.log('🧪 Testing Forgot Password Flow...');
    
    // Step 1: Request OTP
    console.log('\n📧 Step 1: Requesting OTP...');
    const forgotResponse = await axios.post('http://localhost:3000/api/auth/forgot-password', {
      email: 'test@example.com'
    });
    
    console.log('✅ OTP request successful:', forgotResponse.data);
    const otp = forgotResponse.data.otp;
    console.log(`🔑 OTP received: ${otp}`);
    
    // Step 2: Reset password with OTP
    console.log('\n🔐 Step 2: Resetting password with OTP...');
    const resetResponse = await axios.post('http://localhost:3000/api/auth/reset-password', {
      email: 'test@example.com',
      otp: otp,
      newPassword: 'newpassword123'
    });
    
    console.log('✅ Password reset successful:', resetResponse.data);
    
    // Step 3: Test login with new password
    console.log('\n🔑 Step 3: Testing login with new password...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test@example.com',
      password: 'newpassword123'
    });
    
    console.log('✅ Login with new password successful:', loginResponse.data.token ? 'Token received' : 'No token');
    
    // Step 4: Test login with old password (should fail)
    console.log('\n❌ Step 4: Testing login with old password (should fail)...');
    try {
      await axios.post('http://localhost:3000/api/auth/login', {
        email: 'test@example.com',
        password: '123456'
      });
      console.log('❌ Login with old password should have failed but succeeded');
    } catch (error) {
      console.log('✅ Login with old password correctly failed:', error.response?.data?.error || error.message);
    }
    
    // Step 5: Test invalid OTP
    console.log('\n🚫 Step 5: Testing invalid OTP...');
    try {
      await axios.post('http://localhost:3000/api/auth/reset-password', {
        email: 'test@example.com',
        otp: '999999',
        newPassword: 'anotherpassword'
      });
      console.log('❌ Invalid OTP should have failed but succeeded');
    } catch (error) {
      console.log('✅ Invalid OTP correctly failed:', error.response?.data?.error || error.message);
    }
    
    // Step 6: Test expired OTP (simulate by using old OTP)
    console.log('\n⏰ Step 6: Testing expired OTP...');
    try {
      await axios.post('http://localhost:3000/api/auth/reset-password', {
        email: 'test@example.com',
        otp: otp, // Using the same OTP again (should be marked as used)
        newPassword: 'anotherpassword'
      });
      console.log('❌ Used OTP should have failed but succeeded');
    } catch (error) {
      console.log('✅ Used OTP correctly failed:', error.response?.data?.error || error.message);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing forgot password:', error.response?.data || error.message);
  }
}

// Run the test
if (require.main === module) {
  testForgotPassword();
}

module.exports = { testForgotPassword };
