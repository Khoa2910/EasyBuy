const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'easybuy'
};

async function addMicrowaveProducts() {
  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Add microwave products to category 11 (Đồ điện gia dụng)
    const products = [
      {
        name: 'Lò vi sóng Samsung 20L công suất 800W',
        description: 'Lò vi sóng Samsung 20L với công suất 800W, thiết kế hiện đại, dễ sử dụng. Có chức năng nướng, hâm nóng và rã đông thông minh.',
        price: 2500000,
        category_id: 11,
        brand_id: 1,
        stock_quantity: 50,
        is_featured: true,
        is_on_sale: false,
        weight: 15.5,
        dimensions: '45.5 x 35.8 x 25.9 cm'
      },
      {
        name: 'Lò vi sóng Panasonic 25L công suất 1000W',
        description: 'Lò vi sóng Panasonic 25L công suất cao 1000W, dung tích lớn phù hợp gia đình. Có chức năng inverter và nhiều chế độ nấu.',
        price: 3200000,
        category_id: 11,
        brand_id: 2,
        stock_quantity: 30,
        is_featured: true,
        is_on_sale: true,
        sale_price: 2800000,
        weight: 18.2,
        dimensions: '48.2 x 38.5 x 28.1 cm'
      },
      {
        name: 'Lò vi sóng Electrolux 30L công suất 1200W',
        description: 'Lò vi sóng Electrolux 30L dung tích lớn, công suất 1200W mạnh mẽ. Thiết kế sang trọng, phù hợp không gian bếp hiện đại.',
        price: 4500000,
        category_id: 11,
        brand_id: 3,
        stock_quantity: 20,
        is_featured: false,
        is_on_sale: false,
        weight: 22.8,
        dimensions: '52.1 x 41.2 x 31.5 cm'
      },
      {
        name: 'Lò vi sóng Sharp 23L công suất 900W',
        description: 'Lò vi sóng Sharp 23L với công suất 900W, thiết kế compact tiết kiệm không gian. Có chức năng nướng kép và hâm nóng đều.',
        price: 2800000,
        category_id: 11,
        brand_id: 4,
        stock_quantity: 40,
        is_featured: true,
        is_on_sale: false,
        weight: 16.5,
        dimensions: '46.8 x 36.2 x 26.8 cm'
      },
      {
        name: 'Lò vi sóng LG 28L công suất 1100W',
        description: 'Lò vi sóng LG 28L công suất 1100W, thiết kế đẹp mắt với màn hình LED. Có nhiều chế độ nấu tự động và chức năng nướng.',
        price: 3800000,
        category_id: 11,
        brand_id: 5,
        stock_quantity: 25,
        is_featured: false,
        is_on_sale: true,
        sale_price: 3400000,
        weight: 19.8,
        dimensions: '49.5 x 39.8 x 29.2 cm'
      }
    ];

    console.log('📦 Adding microwave products...');
    
    for (const product of products) {
      // Generate slug and SKU
      const slug = product.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .trim();
      
      const sku = `MW-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      const [result] = await connection.execute(`
        INSERT INTO products (name, description, price, category_id, brand_id, stock_quantity, is_featured, is_on_sale, sale_price, weight, dimensions, slug, sku, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW())
      `, [
        product.name,
        product.description,
        product.price,
        product.category_id,
        product.brand_id,
        product.stock_quantity,
        product.is_featured,
        product.is_on_sale,
        product.sale_price || null,
        product.weight,
        product.dimensions,
        slug,
        sku
      ]);
      
      const productId = result.insertId;
      console.log(`✅ Added product: ${product.name} (ID: ${productId})`);
      
      // Add product images
      const images = [
        {
          image_url: '/static/products/microwave-samsung-20l.jpg',
          is_primary: true
        },
        {
          image_url: '/static/products/microwave-samsung-20l-2.jpg',
          is_primary: false
        }
      ];
      
      for (const image of images) {
        await connection.execute(`
          INSERT INTO product_images (product_id, image_url, is_primary, created_at)
          VALUES (?, ?, ?, NOW())
        `, [productId, image.image_url, image.is_primary]);
      }
      
      console.log(`📸 Added ${images.length} images for ${product.name}`);
    }

    console.log('🎉 Successfully added microwave products!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

addMicrowaveProducts();
