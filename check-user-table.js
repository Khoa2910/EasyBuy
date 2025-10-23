const mysql = require('mysql2/promise');

async function checkUserTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'easybuy'
    });

    console.log('🔗 Connected to database');

    // Get table structure
    const [columns] = await connection.execute('DESCRIBE users');
    
    console.log('📋 Users table structure:');
    columns.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.Field} (${column.Type}) - ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Get user data
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      ['dangkhoa29102k2@gmail.com']
    );
    
    if (users.length > 0) {
      const user = users[0];
      console.log('\n👤 User data:');
      Object.keys(user).forEach(key => {
        console.log(`   ${key}: ${user[key]}`);
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
  checkUserTable();
}

module.exports = { checkUserTable };
