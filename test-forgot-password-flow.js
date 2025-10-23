const axios = require('axios');

async function testForgotPasswordFlow() {
  try {
    console.log('🧪 Testing Complete Forgot Password Flow...');
    
    // Step 1: Test forgot password API
    console.log('\n📧 Step 1: Testing forgot password API...');
    const forgotResponse = await axios.post('http://localhost:3000/api/auth/forgot-password', {
      email: 'test@example.com'
    });
    
    console.log('✅ Forgot password API works:', forgotResponse.data);
    const otp = forgotResponse.data.otp;
    console.log(`🔑 OTP received: ${otp}`);
    
    // Step 2: Test reset password API
    console.log('\n🔐 Step 2: Testing reset password API...');
    const resetResponse = await axios.post('http://localhost:3000/api/auth/reset-password', {
      email: 'test@example.com',
      otp: otp,
      newPassword: 'newpassword123'
    });
    
    console.log('✅ Reset password API works:', resetResponse.data);
    
    // Step 3: Test login with new password
    console.log('\n🔑 Step 3: Testing login with new password...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test@example.com',
      password: 'newpassword123'
    });
    
    console.log('✅ Login with new password works:', loginResponse.data.token ? 'Token received' : 'No token');
    
    // Step 4: Test with your email
    console.log('\n📧 Step 4: Testing with your email...');
    const yourEmailResponse = await axios.post('http://localhost:3000/api/auth/forgot-password', {
      email: 'dangkhoa29102k2@gmail.com'
    });
    
    console.log('✅ Forgot password works for your email:', yourEmailResponse.data);
    console.log(`🔑 OTP for your email: ${yourEmailResponse.data.otp}`);
    
    console.log('\n🎉 All tests passed! Forgot password feature is working correctly.');
    console.log('\n📋 How to use:');
    console.log('1. Go to: http://localhost:3000/login-simple.html');
    console.log('2. Click "Quên mật khẩu?" link');
    console.log('3. Enter your email: dangkhoa29102k2@gmail.com');
    console.log('4. Check console for OTP (in production, this would be sent via email)');
    console.log('5. Enter OTP and new password');
    console.log('6. Login with new password');
    
  } catch (error) {
    console.error('❌ Error testing forgot password flow:', error.response?.data || error.message);
  }
}

// Run the test
if (require.main === module) {
  testForgotPasswordFlow();
}

module.exports = { testForgotPasswordFlow };
