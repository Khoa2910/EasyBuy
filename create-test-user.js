const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'easybuy'
    });

    console.log('🔗 Connected to database');

    // Hash password
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create test user
    await connection.execute(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, phone, 
        is_email_verified, is_phone_verified, is_active, role, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      'test@example.com',
      hashedPassword,
      'Test',
      'User',
      '0123456789',
      1,
      0,
      1,
      'customer'
    ]);

    console.log('✅ Test user created:');
    console.log('   Email: test@example.com');
    console.log('   Password: 123456');
    console.log('   Name: Test User');

    // Get the user ID
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['test@example.com']
    );

    if (users.length > 0) {
      const userId = users[0].id;
      console.log(`   User ID: ${userId}`);

      // Add sample addresses for this user
      const sampleAddresses = [
        {
          user_id: userId,
          type: 'home',
          is_default: true,
          recipient_name: 'Test User',
          phone: '0123456789',
          address_line1: '123 Test Street',
          address_line2: 'Apartment 1A',
          city: 'Hanoi',
          state: 'Hanoi',
          postal_code: '100000',
          country: 'Vietnam'
        },
        {
          user_id: userId,
          type: 'office',
          is_default: false,
          recipient_name: 'Test User Office',
          phone: '0987654321',
          address_line1: '456 Office Building',
          address_line2: 'Floor 5',
          city: 'Ho Chi Minh City',
          state: 'Ho Chi Minh City',
          postal_code: '700000',
          country: 'Vietnam'
        }
      ];

      for (const address of sampleAddresses) {
        await connection.execute(`
          INSERT INTO user_addresses (
            user_id, type, is_default, recipient_name, phone, 
            address_line1, address_line2, city, state, postal_code, country, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          address.user_id,
          address.type,
          address.is_default,
          address.recipient_name,
          address.phone,
          address.address_line1,
          address.address_line2,
          address.city,
          address.state,
          address.postal_code,
          address.country
        ]);
      }

      console.log('✅ Sample addresses added for test user');
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
  createTestUser();
}

module.exports = { createTestUser };