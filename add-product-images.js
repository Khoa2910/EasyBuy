const mysql = require('mysql2/promise');

async function addProductImages() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'easybuy'
  });

  console.log('🖼️ Adding product images...');

  try {
    // Get all products
    const [products] = await connection.execute('SELECT id, name FROM products WHERE is_active = TRUE');
    console.log(`Found ${products.length} products`);

    // Sample image URLs (using placeholder for now)
    const imageUrls = [
      '/static/products/water-heater.jpg',
      '/static/products/stove.jpg', 
      '/static/products/water-filter.jpg',
      '/static/products/refrigerator.jpg',
      '/static/products/washing-machine.jpg',
      '/static/products/air-conditioner.jpg',
      '/static/products/microwave.jpg',
      '/static/products/vacuum.jpg'
    ];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const imageUrl = imageUrls[i % imageUrls.length];
      
      // Check if image already exists
      const [existing] = await connection.execute(
        'SELECT id FROM product_images WHERE product_id = ? AND is_primary = TRUE',
        [product.id]
      );

      if (existing.length === 0) {
        // Add primary image
        await connection.execute(`
          INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
          VALUES (?, ?, ?, TRUE, 1)
        `, [product.id, imageUrl, product.name]);
        
        console.log(`✅ Added image for: ${product.name}`);
      } else {
        console.log(`⏭️ Image already exists for: ${product.name}`);
      }
    }

    console.log('🎉 Product images added successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

addProductImages();
