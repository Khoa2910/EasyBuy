const mysql = require('mysql2');

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'easybuy'
});

// Sample products data
const products = [
  {
    name: 'Máy nước nóng Ariston 15L',
    slug: 'may-nuoc-nong-ariston-15l',
    description: 'Máy nước nóng Ariston 15L tiết kiệm điện, an toàn tuyệt đối',
    short_description: 'Máy nước nóng Ariston 15L',
    sku: 'ARISTON-15L-001',
    category_id: 1,
    brand_id: 1,
    price: 2990000,
    compare_price: 3500000,
    cost_price: 2000000,
    stock_quantity: 50,
    image_url: 'https://via.placeholder.com/300x300/4A90E2/FFFFFF?text=Máy+nước+nóng',
    is_active: true,
    is_featured: true
  },
  {
    name: 'Tủ lạnh Samsung 300L',
    slug: 'tu-lanh-samsung-300l',
    description: 'Tủ lạnh Samsung 300L inverter, tiết kiệm điện',
    short_description: 'Tủ lạnh Samsung 300L',
    sku: 'SAMSUNG-FRIDGE-300L',
    category_id: 1,
    brand_id: 2,
    price: 8500000,
    compare_price: 9500000,
    cost_price: 6000000,
    stock_quantity: 30,
    image_url: 'https://via.placeholder.com/300x300/7ED321/FFFFFF?text=Tủ+lạnh',
    is_active: true,
    is_featured: true
  },
  {
    name: 'Máy giặt LG 8kg',
    slug: 'may-giat-lg-8kg',
    description: 'Máy giặt LG 8kg inverter, tiết kiệm nước',
    short_description: 'Máy giặt LG 8kg',
    sku: 'LG-WASHER-8KG',
    category_id: 1,
    brand_id: 3,
    price: 6500000,
    compare_price: 7500000,
    cost_price: 4500000,
    stock_quantity: 25,
    image_url: 'https://via.placeholder.com/300x300/F5A623/FFFFFF?text=Máy+giặt',
    is_active: true,
    is_featured: false
  },
  {
    name: 'TV Samsung 55 inch',
    slug: 'tv-samsung-55-inch',
    description: 'TV Samsung 55 inch 4K UHD Smart TV',
    short_description: 'TV Samsung 55 inch',
    sku: 'SAMSUNG-TV-55',
    category_id: 2,
    brand_id: 2,
    price: 12000000,
    compare_price: 15000000,
    cost_price: 8000000,
    stock_quantity: 15,
    image_url: 'https://via.placeholder.com/300x300/BD10E0/FFFFFF?text=TV+55+inch',
    is_active: true,
    is_featured: true
  },
  {
    name: 'Điều hòa Daikin 1.5HP',
    slug: 'dieu-hoa-daikin-1-5hp',
    description: 'Điều hòa Daikin 1.5HP inverter, tiết kiệm điện',
    short_description: 'Điều hòa Daikin 1.5HP',
    sku: 'DAIKIN-AC-1.5HP',
    category_id: 1,
    brand_id: 4,
    price: 7500000,
    compare_price: 8500000,
    cost_price: 5000000,
    stock_quantity: 20,
    image_url: 'https://via.placeholder.com/300x300/50E3C2/FFFFFF?text=Điều+hòa',
    is_active: true,
    is_featured: false
  }
];

async function cleanAndInsertData() {
  try {
    console.log('🔄 Cleaning old data and inserting new data...');
    
    // Clean old data
    await db.promise().execute('DELETE FROM cart_items WHERE user_id = 1');
    await db.promise().execute('DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE sku LIKE "ARISTON%" OR sku LIKE "SAMSUNG%" OR sku LIKE "LG%" OR sku LIKE "DAIKIN%")');
    await db.promise().execute('DELETE FROM products WHERE sku LIKE "ARISTON%" OR sku LIKE "SAMSUNG%" OR sku LIKE "LG%" OR sku LIKE "DAIKIN%"');
    
    console.log('✅ Cleaned old data');
    
    // Insert products
    for (const product of products) {
      const query = `
        INSERT INTO products (
          name, slug, description, short_description, sku, category_id, brand_id,
          price, compare_price, cost_price, stock_quantity, is_active, is_featured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const [result] = await db.promise().execute(query, [
        product.name, product.slug, product.description, product.short_description,
        product.sku, product.category_id, product.brand_id, product.price,
        product.compare_price, product.cost_price, product.stock_quantity,
        product.is_active, product.is_featured
      ]);
      
      // Insert product image
      const imageQuery = `
        INSERT INTO product_images (product_id, image_url, alt_text, is_primary)
        VALUES (?, ?, ?, ?)
      `;
      
      await db.promise().execute(imageQuery, [
        result.insertId, product.image_url, product.name, true
      ]);
      
      console.log(`✅ Inserted product: ${product.name} with ID: ${result.insertId}`);
    }
    
    // Insert cart items
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const query = `
        INSERT INTO cart_items (user_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `;
      
      // Get the product ID from the database
      const [productResult] = await db.promise().execute(
        'SELECT id FROM products WHERE sku = ?',
        [product.sku]
      );
      
      if (productResult.length > 0) {
        await db.promise().execute(query, [
          1, productResult[0].id, 1, product.price
        ]);
        
        console.log(`✅ Inserted cart item for product: ${product.name}`);
      }
    }
    
    console.log('🎉 Data cleaned and inserted successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.end();
  }
}

cleanAndInsertData();















