const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testForgotPasswordFlow() {
  console.log('🧪 Testing Forgot Password Flow (Fixed)');
  console.log('=====================================');

  try {
    // Step 1: Test forgot password
    console.log('\n📧 Step 1: Request password reset...');
    const forgotResponse = await axios.post(`${BASE_URL}/api/auth/forgot-password`, {
      email: 'test@example.com'
    });

    console.log('✅ Forgot password response:', forgotResponse.data);
    const otp = forgotResponse.data.otp;
    console.log(`🔢 OTP received: ${otp}`);

    // Step 2: Test reset password
    console.log('\n🔐 Step 2: Reset password with OTP...');
    const resetResponse = await axios.post(`${BASE_URL}/api/auth/reset-password`, {
      email: 'test@example.com',
      otp: otp,
      newPassword: 'newpassword123'
    });

    console.log('✅ Reset password response:', resetResponse.data);

    // Step 3: Test login with new password
    console.log('\n🔑 Step 3: Test login with new password...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'newpassword123'
    });

    console.log('✅ Login with new password successful:', loginResponse.data.message);

    // Step 4: Test login with old password (should fail)
    console.log('\n❌ Step 4: Test login with old password (should fail)...');
    try {
      await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'test@example.com',
        password: '123456' // old password
      });
      console.log('❌ ERROR: Old password still works!');
    } catch (error) {
      console.log('✅ Good: Old password no longer works');
    }

    console.log('\n🎉 Forgot Password Flow Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testForgotPasswordFlow();
