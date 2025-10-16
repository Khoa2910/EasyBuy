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

// Sample cart items data
const cartItems = [
  { user_id: 1, product_id: 1, quantity: 1, price: 2990000 },
  { user_id: 1, product_id: 2, quantity: 1, price: 8500000 },
  { user_id: 1, product_id: 3, quantity: 1, price: 6500000 },
  { user_id: 1, product_id: 4, quantity: 1, price: 12000000 },
  { user_id: 1, product_id: 5, quantity: 1, price: 7500000 }
];

async function insertSampleData() {
  try {
    console.log('🔄 Inserting sample data...');
    
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
    for (const item of cartItems) {
      const query = `
        INSERT INTO cart_items (user_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `;
      
      await db.promise().execute(query, [
        item.user_id, item.product_id, item.quantity, item.price
      ]);
      
      console.log(`✅ Inserted cart item for product ID: ${item.product_id}`);
    }
    
    console.log('🎉 Sample data inserted successfully!');
    
  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
  } finally {
    db.end();
  }
}

insertSampleData();
