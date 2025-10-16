const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'easybuy'
};

async function addTestData() {
  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Get admin user ID
    const [users] = await connection.execute(`
      SELECT id FROM users WHERE email = 'admin@tmdt.com'
    `);
    
    if (users.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }
    
    const adminId = users[0].id;
    console.log('👤 Admin user ID:', adminId);

    // Clear existing cart and wishlist for admin
    await connection.execute('DELETE FROM cart_items WHERE user_id = ?', [adminId]);
    await connection.execute('DELETE FROM wishlist WHERE user_id = ?', [adminId]);
    console.log('🧹 Cleared existing cart and wishlist');

    // Add some products to cart
    const cartProducts = [82, 74, 75, 76, 77, 78, 79, 80]; // 8 products
    for (let i = 0; i < cartProducts.length; i++) {
      // Get product price first
      const [product] = await connection.execute(`
        SELECT price FROM products WHERE id = ?
      `, [cartProducts[i]]);
      
      if (product.length > 0) {
        await connection.execute(`
          INSERT INTO cart_items (user_id, product_id, quantity, price) 
          VALUES (?, ?, 1, ?)
        `, [adminId, cartProducts[i], product[0].price]);
      }
    }
    console.log('🛒 Added 8 products to cart');

    // Add some products to wishlist
    const wishlistProducts = [82, 85, 86]; // 3 products
    for (let productId of wishlistProducts) {
      await connection.execute(`
        INSERT INTO wishlist (user_id, product_id) 
        VALUES (?, ?)
      `, [adminId, productId]);
    }
    console.log('❤️ Added 3 products to wishlist');

    // Verify data
    const [cartCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM cart_items WHERE user_id = ?
    `, [adminId]);
    
    const [wishlistCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM wishlist WHERE user_id = ?
    `, [adminId]);
    
    console.log('✅ Final counts:');
    console.log(`  - Cart: ${cartCount[0].count} items`);
    console.log(`  - Wishlist: ${wishlistCount[0].count} items`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

addTestData();
