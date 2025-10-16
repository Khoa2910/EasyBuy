const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'easybuy'
};

async function debugProducts() {
  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Check products in category 4
    const [products] = await connection.execute(`
      SELECT 
        p.id, p.name, p.category_id, p.is_active,
        c.name as category_name,
        pi.image_url as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE p.category_id = 4
      ORDER BY p.id DESC
      LIMIT 10
    `);
    
    console.log('📦 Products in category 4:');
    products.forEach(product => {
      console.log(`  - ID: ${product.id}, Name: ${product.name}, Active: ${product.is_active}, Category: ${product.category_name}, Image: ${product.primary_image}`);
    });
    
    // Check if any products are active
    const [activeProducts] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM products 
      WHERE category_id = 4 AND is_active = TRUE
    `);
    
    console.log(`\n📊 Active products in category 4: ${activeProducts[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

debugProducts();
