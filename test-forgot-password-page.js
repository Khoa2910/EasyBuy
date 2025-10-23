const axios = require('axios');

async function testForgotPasswordPage() {
  try {
    console.log('🧪 Testing Forgot Password Page...');
    
    // Test if the page is accessible
    const response = await axios.get('http://localhost:3000/forgot-password.html');
    
    if (response.status === 200) {
      console.log('✅ Forgot password page is accessible');
      console.log('📄 Page content length:', response.data.length);
      
      // Check if the page contains expected elements
      if (response.data.includes('Quên mật khẩu?')) {
        console.log('✅ Page contains "Quên mật khẩu?" text');
      } else {
        console.log('❌ Page does not contain "Quên mật khẩu?" text');
      }
      
      if (response.data.includes('forgotPasswordForm')) {
        console.log('✅ Page contains forgotPasswordForm');
      } else {
        console.log('❌ Page does not contain forgotPasswordForm');
      }
      
      if (response.data.includes('/api/auth/forgot-password')) {
        console.log('✅ Page contains correct API endpoint');
      } else {
        console.log('❌ Page does not contain correct API endpoint');
      }
      
    } else {
      console.log('❌ Page not accessible, status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error testing forgot password page:', error.response?.status || error.message);
  }
}

// Run the test
if (require.main === module) {
  testForgotPasswordPage();
}

module.exports = { testForgotPasswordPage };
