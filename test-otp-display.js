const mysql = require('mysql2');

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'tmdt_ecommerce'
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    return;
  }
  console.log('✅ Connected to MySQL database');
  
  // Get latest OTP for admin@tmdt.com
  db.query(
    "SELECT * FROM otp_verifications WHERE email = 'admin@tmdt.com' ORDER BY created_at DESC LIMIT 1",
    (err, results) => {
      if (err) {
        console.error('❌ Error querying OTP:', err);
        return;
      }
      
      if (results.length > 0) {
        const otp = results[0];
        console.log('\n' + '='.repeat(60));
        console.log('🔍 LATEST OTP FOUND IN DATABASE');
        console.log('='.repeat(60));
        console.log(`📧 Email: ${otp.email}`);
        console.log(`🔢 OTP Code: ${otp.otp_code}`);
        console.log(`📝 Type: ${otp.type}`);
        console.log(`⏰ Created: ${otp.created_at}`);
        console.log(`⏰ Expires: ${otp.expires_at}`);
        console.log(`✅ Used: ${otp.is_used ? 'Yes' : 'No'}`);
        console.log('='.repeat(60));
        console.log('💡 Sử dụng mã OTP này để đăng nhập!');
        console.log('='.repeat(60) + '\n');
      } else {
        console.log('❌ No OTP found for admin@tmdt.com');
      }
      
      db.end();
    }
  );
});
