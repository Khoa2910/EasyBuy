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

    // Update microwave products to category 4 (Đồ điện gia dụng)
    const [result] = await connection.execute(`
      UPDATE products 
      SET category_id = 4 
      WHERE name LIKE '%lò vi sóng%' OR name LIKE '%microwave%'
    `);
    
    console.log(`✅ Updated ${result.affectedRows} microwave products to category 4 (Đồ điện gia dụng)`);
    
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
