const mysql = require('mysql2/promise');

async function addSampleAddresses() {
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

    // Get a user ID (assuming there's at least one user)
    const [users] = await connection.execute('SELECT id FROM users WHERE role = "customer" LIMIT 1');
    
    if (users.length === 0) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }

    const userId = users[0].id;
    console.log(`👤 Using user ID: ${userId}`);

    // Sample addresses
    const sampleAddresses = [
      {
        user_id: userId,
        type: 'home',
        is_default: true,
        recipient_name: 'Nguyễn Văn A',
        phone: '0909856947',
        address_line1: '123 Đường ABC',
        address_line2: 'Tầng 2, Phòng 201',
        city: 'Hà Nội',
        state: 'Hà Nội',
        postal_code: '100000',
        country: 'Vietnam'
      },
      {
        user_id: userId,
        type: 'office',
        is_default: false,
        recipient_name: 'Nguyễn Thị B',
        phone: '09822222222',
        address_line1: '456 Đường XYZ',
        address_line2: 'Tòa nhà DEF',
        city: 'TP. Hồ Chí Minh',
        state: 'TP. Hồ Chí Minh',
        postal_code: '700000',
        country: 'Vietnam'
      },
      {
        user_id: userId,
        type: 'other',
        is_default: false,
        recipient_name: 'Trần Văn C',
        phone: '0909856946',
        address_line1: '789 Đường GHI',
        address_line2: null,
        city: 'Đà Nẵng',
        state: 'Đà Nẵng',
        postal_code: '500000',
        country: 'Vietnam'
      }
    ];

    // Clear existing addresses for this user
    await connection.execute('DELETE FROM user_addresses WHERE user_id = ?', [userId]);
    console.log('🗑️ Cleared existing addresses');

    // Insert sample addresses
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

    console.log('✅ Added sample addresses:');
    sampleAddresses.forEach((addr, index) => {
      console.log(`   ${index + 1}. ${addr.recipient_name} - ${addr.address_line1}, ${addr.city}`);
    });

    // Verify the data
    const [addresses] = await connection.execute(
      'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC',
      [userId]
    );

    console.log('\n📋 Current addresses in database:');
    addresses.forEach((addr, index) => {
      console.log(`   ${index + 1}. ID: ${addr.id}`);
      console.log(`      Name: ${addr.recipient_name}`);
      console.log(`      Phone: ${addr.phone}`);
      console.log(`      Address: ${addr.address_line1}${addr.address_line2 ? ', ' + addr.address_line2 : ''}`);
      console.log(`      City: ${addr.city}, ${addr.state} ${addr.postal_code}`);
      console.log(`      Default: ${addr.is_default ? 'Yes' : 'No'}`);
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
  addSampleAddresses();
}

module.exports = { addSampleAddresses };
