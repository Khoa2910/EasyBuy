const mysql = require('mysql2/promise');

async function checkImages() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'easybuy'
  });

  console.log('🔍 Checking product images in database...');

  try {
    // Check product_images table
    const [images] = await connection.execute(`
      SELECT 
        pi.*,
        p.name as product_name
      FROM product_images pi
      LEFT JOIN products p ON pi.product_id = p.id
      WHERE pi.is_primary = TRUE
      LIMIT 10
    `);

    console.log(`Found ${images.length} product images:`);
    images.forEach(img => {
      console.log(`- ${img.product_name}: ${img.image_url}`);
    });

    // Check featured products with images
    const [featured] = await connection.execute(`
      SELECT 
        p.*,
        pi.image_url
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE p.is_active = TRUE AND p.is_featured = TRUE
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    console.log(`\nFeatured products with images:`);
    featured.forEach(product => {
      console.log(`- ${product.name}: ${product.image_url || 'NO IMAGE'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkImages();
