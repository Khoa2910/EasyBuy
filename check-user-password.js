const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function checkUserPassword() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'easybuy'
    });

    console.log('🔗 Connected to database');

    // Get user details
    const [users] = await connection.execute(
      'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = ?',
      ['dangkhoa29102k2@gmail.com']
    );
    
    if (users.length > 0) {
      const user = users[0];
      console.log('👤 User found:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Password hash: ${user.password_hash}`);
      
      // Test common passwords
      const commonPasswords = ['123456', 'password123', 'admin123', '123456789', 'password', 'admin', 'khoa123'];
      
      console.log('\n🔍 Testing common passwords:');
      for (const password of commonPasswords) {
        const isValid = await bcrypt.compare(password, user.password_hash);
        console.log(`   ${password}: ${isValid ? '✅ MATCH' : '❌ No match'}`);
      }
    } else {
      console.log('❌ User not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
if (require.main === module) {
  checkUserPassword();
}

module.exports = { checkUserPassword };
