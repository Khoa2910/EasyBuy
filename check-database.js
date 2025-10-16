const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'easybuy'
};

async function checkDatabase() {
  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Check cart_items
    const [cartItems] = await connection.execute(`
      SELECT ci.*, p.name as product_name, p.price 
      FROM cart_items ci 
      LEFT JOIN products p ON ci.product_id = p.id 
      WHERE ci.user_id = 16
      ORDER BY ci.created_at DESC
    `);
    
    console.log('🛒 Cart items in database:', cartItems.length);
    cartItems.forEach(item => {
      console.log(`  - ${item.product_name}: ${item.quantity} x ${item.price}`);
    });

    // Check wishlist
    const [wishlistItems] = await connection.execute(`
      SELECT w.*, p.name as product_name, p.price 
      FROM wishlist w 
      LEFT JOIN products p ON w.product_id = p.id 
      WHERE w.user_id = 16
      ORDER BY w.created_at DESC
    `);
    
    console.log('❤️ Wishlist items in database:', wishlistItems.length);
    wishlistItems.forEach(item => {
      console.log(`  - ${item.product_name}: ${item.price}`);
    });

    // Check user
    const [users] = await connection.execute(`
      SELECT id, email, first_name, last_name FROM users WHERE id = 16
    `);
    
    console.log('👤 User info:', users[0] || 'Not found');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

checkDatabase();