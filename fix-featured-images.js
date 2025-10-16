const mysql = require('mysql2/promise');

async function fixFeaturedImages() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'easybuy'
  });

  console.log('🔧 Fixing featured products images...');

  try {
    // Get featured products
    const [featuredProducts] = await connection.execute(`
      SELECT p.id, p.name 
      FROM products p 
      WHERE p.is_featured = TRUE AND p.is_active = TRUE
      ORDER BY p.created_at DESC
      LIMIT 8
    `);

    console.log(`Found ${featuredProducts.length} featured products`);

    // Real images from your folder
    const realImages = [
      '/static/products/do-gia-dung-thong-minh.jpg',
      '/static/products/do-gia-dung-2.jpg', 
      '/static/products/Do-inox-gia-dung6.png',
      '/static/products/images.jpg',
      '/static/products/co-nen-kinh-doanh-do-gia-dung-hay-khong.jpg',
      '/static/products/de-buoc-vao-nghe-kinh-doanh-san-pham-do-gia-dung-inox-can-chuan-bi-gi-7397.jpg',
      '/static/products/do-gia-dung-thong-minh-2-800x800.jpeg',
      '/static/products/avaa2.webp'
    ];

    // Update featured products with real images
    for (let i = 0; i < featuredProducts.length; i++) {
      const product = featuredProducts[i];
      const imageUrl = realImages[i % realImages.length];
      
      // Delete existing placeholder images
      await connection.execute(`
        DELETE FROM product_images 
        WHERE product_id = ? AND image_url LIKE 'https://via.placeholder.com%'
      `, [product.id]);
      
      // Insert real image
      await connection.execute(`
        INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
        VALUES (?, ?, ?, TRUE, 1)
        ON DUPLICATE KEY UPDATE 
        image_url = VALUES(image_url),
        alt_text = VALUES(alt_text)
      `, [product.id, imageUrl, product.name]);
      
      console.log(`✅ Updated featured product: ${product.name} -> ${imageUrl}`);
    }

    console.log('🎉 Featured products images fixed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

fixFeaturedImages();
