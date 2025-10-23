const mysql = require('mysql2/promise');

async function checkUsers() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'easybuy'
    });

    console.log('🔗 Connected to database');

    // Get all users
    const [users] = await connection.execute('SELECT id, email, first_name, last_name, role FROM users');
    
    console.log('👥 Users in database:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user.id}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Name: ${user.first_name} ${user.last_name}`);
      console.log(`      Role: ${user.role}`);
      console.log('');
    });

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
  checkUsers();
}

module.exports = { checkUsers };
