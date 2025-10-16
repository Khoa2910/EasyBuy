const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'easybuy'
};

async function fixProductImages() {
  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Get all products with their current images
    const [products] = await connection.execute(`
      SELECT p.id, p.name, p.category_id, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE
      ORDER BY p.id
    `);
    
    console.log('📦 Found products:');
    products.forEach(product => {
      console.log(`  - ID: ${product.id}, Name: ${product.name}, Category: ${product.category_name}`);
    });
    
    // Update product images with unique images based on product type
    const imageMappings = {
      // Microwave ovens - different images
      82: ['/static/products/microwave-samsung-20l.jpg', '/static/products/microwave-samsung-20l-2.jpg'],
      83: ['/static/products/microwave-panasonic-25l.jpg', '/static/products/microwave-panasonic-25l-2.jpg'],
      84: ['/static/products/microwave-electrolux-30l.jpg', '/static/products/microwave-electrolux-30l-2.jpg'],
      85: ['/static/products/microwave-sharp-23l.jpg', '/static/products/microwave-sharp-23l-2.jpg'],
      86: ['/static/products/microwave-lg-28l.jpg', '/static/products/microwave-lg-28l-2.jpg'],
      
      // Water heater
      19: ['/static/products/water-heater-ariston.jpg', '/static/products/water-heater-ariston-2.jpg'],
      
      // Refrigerator
      20: ['/static/products/refrigerator-samsung.jpg', '/static/products/refrigerator-samsung-2.jpg'],
      
      // TV
      21: ['/static/products/tv-samsung-55.jpg', '/static/products/tv-samsung-55-2.jpg'],
      
      // Rice cooker
      22: ['/static/products/rice-cooker-tiger.jpg', '/static/products/rice-cooker-tiger-2.jpg'],
      
      // Induction hob
      23: ['/static/products/induction-hob-electrolux.jpg', '/static/products/induction-hob-electrolux-2.jpg']
    };
    
    console.log('\n🖼️ Updating product images...');
    
    for (const [productId, images] of Object.entries(imageMappings)) {
      // Delete existing images
      await connection.execute(`
        DELETE FROM product_images WHERE product_id = ?
      `, [productId]);
      
      // Add new images
      for (let i = 0; i < images.length; i++) {
        await connection.execute(`
          INSERT INTO product_images (product_id, image_url, is_primary, created_at)
          VALUES (?, ?, ?, NOW())
        `, [productId, images[i], i === 0]);
      }
      
      console.log(`✅ Updated images for product ${productId}: ${images.join(', ')}`);
    }
    
    console.log('\n🎉 Successfully updated product images!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

fixProductImages();
