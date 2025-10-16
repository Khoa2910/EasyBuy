const mysql = require('mysql2/promise');

async function addProducts() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'easybuy'
  });

  console.log('🚀 Adding sample products...');

  try {
    // Check if products exist
    const [existing] = await connection.execute('SELECT COUNT(*) as count FROM products');
    if (existing[0].count > 0) {
      console.log('✅ Products already exist');
      return;
    }

    // Get first category and brand
    const [categories] = await connection.execute('SELECT id FROM categories LIMIT 1');
    const [brands] = await connection.execute('SELECT id FROM brands LIMIT 1');
    
    const categoryId = categories[0]?.id || 1;
    const brandId = brands[0]?.id || 1;

    // Sample products
    const products = [
      {
        name: 'Máy nước nóng Ariston 15L',
        description: 'Máy nước nóng điện Ariston 15L, tiết kiệm điện, an toàn tuyệt đối',
        price: 2990000,
        sku: 'ARISTON-15L-001',
        stock_quantity: 50,
        is_featured: true
      },
      {
        name: 'Bếp từ đôi Sunhouse SHD4609',
        description: 'Bếp từ đôi Sunhouse SHD4609, công suất cao, tiết kiệm điện',
        price: 1890000,
        sku: 'SUNHOUSE-SHD4609',
        stock_quantity: 30,
        is_featured: true
      },
      {
        name: 'Máy lọc nước RO Karofi KAQ-U95',
        description: 'Máy lọc nước RO Karofi KAQ-U95, 9 cấp lọc, công nghệ RO tiên tiến',
        price: 4590000,
        sku: 'KAROFI-KAQ-U95',
        stock_quantity: 25,
        is_featured: true
      },
      {
        name: 'Tủ lạnh Samsung RT25K4030BY',
        description: 'Tủ lạnh Samsung RT25K4030BY, dung tích 250L, tiết kiệm điện A++',
        price: 8990000,
        sku: 'SAMSUNG-RT25K4030BY',
        stock_quantity: 15,
        is_featured: true
      },
      {
        name: 'Máy giặt LG T2109VSPM',
        description: 'Máy giặt LG T2109VSPM, 9kg, công nghệ Inverter, tiết kiệm điện',
        price: 6990000,
        sku: 'LG-T2109VSPM',
        stock_quantity: 20,
        is_featured: true
      },
      {
        name: 'Điều hòa Daikin FTKC35UAVMV',
        description: 'Điều hòa Daikin FTKC35UAVMV, 1.5HP, Inverter, tiết kiệm điện',
        price: 12990000,
        sku: 'DAIKIN-FTKC35UAVMV',
        stock_quantity: 12,
        is_featured: true
      },
      {
        name: 'Lò vi sóng Sharp R-205VN',
        description: 'Lò vi sóng Sharp R-205VN, 20L, nhiều chế độ nấu, tiết kiệm điện',
        price: 1590000,
        sku: 'SHARP-R-205VN',
        stock_quantity: 35,
        is_featured: true
      },
      {
        name: 'Máy hút bụi Electrolux ZB3314AK',
        description: 'Máy hút bụi Electrolux ZB3314AK, công suất cao, túi lọc HEPA',
        price: 2290000,
        sku: 'ELECTROLUX-ZB3314AK',
        stock_quantity: 28,
        is_featured: true
      }
    ];

    // Insert products
    for (const product of products) {
      await connection.execute(`
        INSERT INTO products (
          name, description, price, category_id, brand_id, sku, 
          stock_quantity, is_featured, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
      `, [
        product.name,
        product.description,
        product.price,
        categoryId,
        brandId,
        product.sku,
        product.stock_quantity,
        product.is_featured
      ]);
      
      console.log(`✅ Added: ${product.name}`);
    }

    console.log('🎉 Sample products added successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

addProducts();
