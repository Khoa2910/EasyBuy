const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'easybuy'
};

async function checkCartTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Check if cart_items table exists
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'cart_items'
    `);
    
    if (tables.length > 0) {
      console.log('✅ cart_items table exists');
      
      // Check table structure
      const [columns] = await connection.execute(`
        DESCRIBE cart_items
      `);
      
      console.log('📋 cart_items table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });
      
    } else {
      console.log('❌ cart_items table does not exist');
      
      // Create cart_items table
      console.log('🔨 Creating cart_items table...');
      await connection.execute(`
        CREATE TABLE cart_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity INT NOT NULL DEFAULT 1,
          variant_id INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ Created cart_items table');
    }
    
    // Check if wishlist table exists
    const [wishlistTables] = await connection.execute(`
      SHOW TABLES LIKE 'wishlist'
    `);
    
    if (wishlistTables.length > 0) {
      console.log('✅ wishlist table exists');
    } else {
      console.log('❌ wishlist table does not exist');
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

checkCartTable();
