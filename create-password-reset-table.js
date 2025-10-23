const mysql = require('mysql2/promise');

async function createPasswordResetTable() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'easybuy'
    });

    console.log('🔗 Connected to database');

    // Create password_reset_tokens table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_token (user_id, token),
        INDEX idx_expires (expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Created password_reset_tokens table');

    // Clean up expired tokens (older than 1 hour)
    const [result] = await connection.execute(
      'DELETE FROM password_reset_tokens WHERE expires_at < NOW() - INTERVAL 1 HOUR'
    );

    console.log(`🧹 Cleaned up ${result.affectedRows} expired tokens`);

    // Show table structure
    const [columns] = await connection.execute('DESCRIBE password_reset_tokens');
    
    console.log('\n📋 password_reset_tokens table structure:');
    columns.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.Field} (${column.Type}) - ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
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
  createPasswordResetTable();
}

module.exports = { createPasswordResetTable };
