const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'easybuy'
};

async function checkMicrowaveProducts() {
  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Check products in category 11
    const [products] = await connection.execute(`
      SELECT p.id, p.name, p.category_id, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = 11
      ORDER BY p.id DESC
      LIMIT 10
    `);
    
    console.log('📦 Products in category 11:');
    products.forEach(product => {
      console.log(`  - ID: ${product.id}, Name: ${product.name}, Category: ${product.category_name}`);
    });
    
    // Check product images
    const [images] = await connection.execute(`
      SELECT pi.product_id, pi.image_url, pi.is_primary, p.name
      FROM product_images pi
      LEFT JOIN products p ON pi.product_id = p.id
      WHERE p.category_id = 11
      ORDER BY pi.product_id, pi.is_primary DESC
    `);
    
    console.log('\n📸 Product images:');
    images.forEach(image => {
      console.log(`  - Product: ${image.name} (ID: ${image.product_id}), Image: ${image.image_url}, Primary: ${image.is_primary}`);
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

checkMicrowaveProducts();
