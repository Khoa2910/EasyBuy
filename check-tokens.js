const mysql = require('mysql2/promise');

async function checkTokens() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'easybuy'
    });

    console.log('🔗 Connected to database');

    // Check password reset tokens
    const [tokens] = await connection.execute(
      'SELECT * FROM password_reset_tokens ORDER BY created_at DESC LIMIT 5'
    );
    
    console.log('📋 Recent password reset tokens:');
    if (tokens.length === 0) {
      console.log('   No tokens found');
    } else {
      tokens.forEach((token, index) => {
        console.log(`   ${index + 1}. ID: ${token.id}`);
        console.log(`      User ID: ${token.user_id}`);
        console.log(`      Token: ${token.token}`);
        console.log(`      Expires: ${token.expires_at}`);
        console.log(`      Used: ${token.used}`);
        console.log(`      Created: ${token.created_at}`);
        console.log('');
      });
    }

    // Check users
    const [users] = await connection.execute(
      'SELECT id, email FROM users WHERE email = ?',
      ['test@example.com']
    );
    
    console.log('👤 User info:');
    if (users.length === 0) {
      console.log('   User not found');
    } else {
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id}, Email: ${user.email}`);
      });
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
  checkTokens();
}

module.exports = { checkTokens };
