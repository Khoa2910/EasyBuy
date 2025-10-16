const mysql = require('mysql2/promise');

async function fixImagePaths() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'easybuy'
  });

  console.log('🔧 Fixing image paths in database...');

  try {
    // Update all image paths from http://localhost/EasyBuy/public/products/ to /static/products/
    const [result] = await connection.execute(`
      UPDATE product_images 
      SET image_url = REPLACE(image_url, 'http://localhost/EasyBuy/public/products/', '/static/products/')
      WHERE image_url LIKE 'http://localhost/EasyBuy/public/products/%'
    `);

    console.log(`✅ Updated ${result.affectedRows} image paths`);

    // Update featured products to use real images instead of placeholders
    const [featuredProducts] = await connection.execute(`
      SELECT p.id, p.name 
      FROM products p 
      WHERE p.is_featured = TRUE AND p.is_active = TRUE
      LIMIT 8
    `);

    console.log(`Found ${featuredProducts.length} featured products`);

    // Assign real images to featured products
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

    for (let i = 0; i < featuredProducts.length; i++) {
      const product = featuredProducts[i];
      const imageUrl = realImages[i % realImages.length];
      
      // Update or insert image for featured product
      await connection.execute(`
        INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
        VALUES (?, ?, ?, TRUE, 1)
        ON DUPLICATE KEY UPDATE 
        image_url = VALUES(image_url),
        alt_text = VALUES(alt_text)
      `, [product.id, imageUrl, product.name]);
      
      console.log(`✅ Updated image for: ${product.name}`);
    }

    console.log('🎉 Image paths fixed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

fixImagePaths();
