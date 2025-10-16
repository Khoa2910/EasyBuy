const mysql = require('mysql2/promise');

async function addSampleProducts() {
  // Database connection
  const connection = await mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'easybuy'
});

console.log('🚀 Adding sample products...');

try {
  // Check if products already exist
  const [existingProducts] = await connection.execute('SELECT COUNT(*) as count FROM products');
  
  if (existingProducts[0].count > 0) {
    console.log('✅ Products already exist, skipping...');
    process.exit(0);
  }

  // Get categories
  const [categories] = await connection.execute('SELECT id, name FROM categories WHERE is_active = TRUE');
  console.log(`📋 Found ${categories.length} categories`);

  // Get brands
  const [brands] = await connection.execute('SELECT id, name FROM brands WHERE is_active = TRUE');
  console.log(`🏷️ Found ${brands.length} brands`);

  // Sample products data
  const sampleProducts = [
    {
      name: 'Máy nước nóng Ariston 15L',
      description: 'Máy nước nóng điện Ariston 15L, tiết kiệm điện, an toàn tuyệt đối',
      price: 2990000,
      category_id: categories[0]?.id || 1,
      brand_id: brands[0]?.id || 1,
      sku: 'ARISTON-15L-001',
      stock_quantity: 50,
      is_featured: true,
      is_active: true
    },
    {
      name: 'Bếp từ đôi Sunhouse SHD4609',
      description: 'Bếp từ đôi Sunhouse SHD4609, công suất cao, tiết kiệm điện',
      price: 1890000,
      category_id: categories[1]?.id || 2,
      brand_id: brands[1]?.id || 2,
      sku: 'SUNHOUSE-SHD4609',
      stock_quantity: 30,
      is_featured: true,
      is_active: true
    },
    {
      name: 'Máy lọc nước RO Karofi KAQ-U95',
      description: 'Máy lọc nước RO Karofi KAQ-U95, 9 cấp lọc, công nghệ RO tiên tiến',
      price: 4590000,
      category_id: categories[2]?.id || 3,
      brand_id: brands[2]?.id || 3,
      sku: 'KAROFI-KAQ-U95',
      stock_quantity: 25,
      is_featured: true,
      is_active: true
    },
    {
      name: 'Tủ lạnh Samsung RT25K4030BY',
      description: 'Tủ lạnh Samsung RT25K4030BY, dung tích 250L, tiết kiệm điện A++',
      price: 8990000,
      category_id: categories[3]?.id || 4,
      brand_id: brands[3]?.id || 4,
      sku: 'SAMSUNG-RT25K4030BY',
      stock_quantity: 15,
      is_featured: true,
      is_active: true
    },
    {
      name: 'Máy giặt LG T2109VSPM',
      description: 'Máy giặt LG T2109VSPM, 9kg, công nghệ Inverter, tiết kiệm điện',
      price: 6990000,
      category_id: categories[4]?.id || 5,
      brand_id: brands[4]?.id || 5,
      sku: 'LG-T2109VSPM',
      stock_quantity: 20,
      is_featured: true,
      is_active: true
    },
    {
      name: 'Điều hòa Daikin FTKC35UAVMV',
      description: 'Điều hòa Daikin FTKC35UAVMV, 1.5HP, Inverter, tiết kiệm điện',
      price: 12990000,
      category_id: categories[5]?.id || 6,
      brand_id: brands[5]?.id || 6,
      sku: 'DAIKIN-FTKC35UAVMV',
      stock_quantity: 12,
      is_featured: true,
      is_active: true
    },
    {
      name: 'Lò vi sóng Sharp R-205VN',
      description: 'Lò vi sóng Sharp R-205VN, 20L, nhiều chế độ nấu, tiết kiệm điện',
      price: 1590000,
      category_id: categories[6]?.id || 7,
      brand_id: brands[6]?.id || 7,
      sku: 'SHARP-R-205VN',
      stock_quantity: 35,
      is_featured: true,
      is_active: true
    },
    {
      name: 'Máy hút bụi Electrolux ZB3314AK',
      description: 'Máy hút bụi Electrolux ZB3314AK, công suất cao, túi lọc HEPA',
      price: 2290000,
      category_id: categories[7]?.id || 8,
      brand_id: brands[7]?.id || 8,
      sku: 'ELECTROLUX-ZB3314AK',
      stock_quantity: 28,
      is_featured: true,
      is_active: true
    }
  ];

  // Insert products
  for (const product of sampleProducts) {
    await connection.execute(`
      INSERT INTO products (
        name, description, price, category_id, brand_id, sku, 
        stock_quantity, is_featured, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      product.name,
      product.description,
      product.price,
      product.category_id,
      product.brand_id,
      product.sku,
      product.stock_quantity,
      product.is_featured,
      product.is_active
    ]);
    
    console.log(`✅ Added: ${product.name}`);
  }

  // Add product images
  const [insertedProducts] = await connection.execute('SELECT id, name FROM products ORDER BY id DESC LIMIT 8');
  
  for (const product of insertedProducts) {
    // Add primary image
    await connection.execute(`
      INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
      VALUES (?, ?, ?, TRUE, 1)
    `, [
      product.id,
      `/static/products/${product.id}.jpg`,
      product.name
    ]);
    
    console.log(`🖼️ Added image for: ${product.name}`);
  }

  console.log('🎉 Sample products added successfully!');
  console.log(`📊 Total products: ${sampleProducts.length}`);
  console.log(`🖼️ Total images: ${insertedProducts.length}`);

} catch (error) {
  console.error('❌ Error adding products:', error);
} finally {
  await connection.end();
}

// Run the function
addSampleProducts().catch(console.error);
