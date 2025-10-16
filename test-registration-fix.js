const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/auth';

async function testRegistration() {
  console.log('🧪 Testing Registration Fix...\n');
  
  const testEmail = `test${Date.now()}@example.com`;
  const testData = {
    email: testEmail,
    firstName: 'Test',
    lastName: 'User',
    phone: '0123456789',
    password: 'test123456'
  };
  
  try {
    // Step 1: Send OTP for registration
    console.log('📧 Step 1: Sending OTP for registration...');
    const otpResponse = await axios.post(`${API_BASE}/send-otp-register`, testData);
    console.log('✅ OTP sent successfully:', otpResponse.data);
    
    // Get OTP from database
    const mysql = require('mysql2');
    const db = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'easybuy'
    });
    
    db.query(
      'SELECT otp_code FROM otp_verifications WHERE email = ? AND type = ? ORDER BY created_at DESC LIMIT 1',
      [testEmail, 'registration'],
      (err, results) => {
        if (err) {
          console.error('❌ Database error:', err);
          return;
        }
        
        if (results.length === 0) {
          console.log('❌ No OTP found in database');
          return;
        }
        
        const otp = results[0].otp_code;
        console.log(`🔢 OTP Code: ${otp}`);
        
        // Continue with verification
        verifyOTP(otp);
      }
    );
    
    function verifyOTP(otp) {
      // Step 2: Verify OTP and complete registration
      console.log('\n🔐 Step 2: Verifying OTP and completing registration...');
      axios.post(`${API_BASE}/verify-otp-register`, {
        ...testData,
        otp: otp
      }).then(verifyResponse => {
        console.log('✅ Registration completed successfully:', verifyResponse.data);
        
        // Step 3: Check if user was saved to database
        console.log('\n🗄️ Step 3: Checking database...');
        db.query('SELECT * FROM users WHERE email = ?', [testEmail], (err, results) => {
          if (err) {
            console.error('❌ Database error:', err);
            return;
          }
          
          if (results.length > 0) {
            console.log('✅ User found in database:', results[0]);
            console.log('\n🎉 REGISTRATION FIX SUCCESSFUL!');
            console.log('✅ User is now properly saved to database');
          } else {
            console.log('❌ User not found in database');
            console.log('❌ Registration fix failed');
          }
          
          db.end();
        });
      }).catch(error => {
        console.error('❌ Verification failed:', error.response?.data || error.message);
        db.end();
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testRegistration();
