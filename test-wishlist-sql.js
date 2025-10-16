const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'easybuy'
};

async function testWishlistSQL() {
  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Test the exact SQL from wishlist API
    const [wishlistItems] = await connection.execute(`
      SELECT 
        w.*,
        p.name as product_name,
        p.price,
        p.sale_price,
        p.is_on_sale,
        pi.image_url as product_image
      FROM wishlist w
      LEFT JOIN products p ON w.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE w.user_id = 1
      ORDER BY w.created_at DESC
    `);
    
    console.log('❤️ Wishlist items from SQL:', wishlistItems.length);
    wishlistItems.forEach(item => {
      console.log(`  - ${item.product_name}: ${item.price} (image: ${item.product_image})`);
    });

    // Test simpler query
    const [simpleWishlist] = await connection.execute(`
      SELECT w.*, p.name as product_name, p.price
      FROM wishlist w
      LEFT JOIN products p ON w.product_id = p.id
      WHERE w.user_id = 1
    `);
    
    console.log('❤️ Simple wishlist query:', simpleWishlist.length);
    simpleWishlist.forEach(item => {
      console.log(`  - ${item.product_name}: ${item.price}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

testWishlistSQL();










