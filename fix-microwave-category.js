const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'easybuy'
};

async function fixMicrowaveCategory() {
  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Find the correct category ID for "Đồ điện gia dụng"
    const [categories] = await connection.execute(`
      SELECT id, name FROM categories WHERE name LIKE '%điện%' OR name LIKE '%gia dụng%'
    `);
    
    console.log('📂 Available categories:');
    categories.forEach(cat => {
      console.log(`  - ID: ${cat.id}, Name: ${cat.name}`);
    });
    
    // Find category 11 (should be "Đồ điện gia dụng")
    const [cat11] = await connection.execute(`
      SELECT id, name FROM categories WHERE id = 11
    `);
    
    if (cat11.length > 0) {
      console.log(`\n🏷️ Category 11: ${cat11[0].name}`);
      
      // Update microwave products to correct category
      const [result] = await connection.execute(`
        UPDATE products 
        SET category_id = 11 
        WHERE name LIKE '%lò vi sóng%' OR name LIKE '%microwave%'
      `);
      
      console.log(`✅ Updated ${result.affectedRows} microwave products to category 11`);
      
      // Verify the update
      const [updated] = await connection.execute(`
        SELECT p.id, p.name, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.name LIKE '%lò vi sóng%'
        ORDER BY p.id DESC
        LIMIT 5
      `);
      
      console.log('\n📦 Updated microwave products:');
      updated.forEach(product => {
        console.log(`  - ID: ${product.id}, Name: ${product.name}, Category: ${product.category_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

fixMicrowaveCategory();
