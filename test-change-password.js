const axios = require('axios');

async function testChangePassword() {
  try {
    console.log('🧪 Testing Change Password API...');
    
    // First, login to get a token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test@example.com',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Test change password
    const changePasswordResponse = await axios.post('http://localhost:3000/api/user/change-password', {
      currentPassword: '123456',
      newPassword: 'newpassword123'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Change password successful:', changePasswordResponse.data);
    
    // Test login with new password
    console.log('\n🔐 Testing login with new password...');
    const newLoginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test@example.com',
      password: 'newpassword123'
    });
    
    console.log('✅ Login with new password successful:', newLoginResponse.data.token ? 'Token received' : 'No token');
    
    // Test login with old password (should fail)
    console.log('\n🔐 Testing login with old password (should fail)...');
    try {
      await axios.post('http://localhost:3000/api/auth/login', {
        email: 'test@example.com',
        password: '123456'
      });
      console.log('❌ Login with old password should have failed but succeeded');
    } catch (error) {
      console.log('✅ Login with old password correctly failed:', error.response?.data?.error || error.message);
    }
    
    // Reset password back to original
    console.log('\n🔄 Resetting password back to original...');
    const resetResponse = await axios.post('http://localhost:3000/api/user/change-password', {
      currentPassword: 'newpassword123',
      newPassword: '123456'
    }, {
      headers: {
        'Authorization': `Bearer ${newLoginResponse.data.token}`
      }
    });
    
    console.log('✅ Password reset successful:', resetResponse.data);
    
  } catch (error) {
    console.error('❌ Error testing change password:', error.response?.data || error.message);
  }
}

// Run the test
if (require.main === module) {
  testChangePassword();
}

module.exports = { testChangePassword };
