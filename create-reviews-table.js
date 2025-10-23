const mysql = require('mysql2/promise');

async function createReviewsTable() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'easybuy'
    });

    try {
        console.log('🔧 Creating product_reviews table...');

        // Create product_reviews table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS product_reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                user_id INT NOT NULL,
                rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                is_approved BOOLEAN DEFAULT FALSE,
                is_rejected BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_product (user_id, product_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ product_reviews table created successfully');

        // Add some sample reviews
        console.log('📝 Adding sample reviews...');
        
        await connection.execute(`
            INSERT IGNORE INTO product_reviews (product_id, user_id, rating, comment, is_approved, created_at)
            VALUES 
            (1, 1, 5, 'Sản phẩm rất tốt, chất lượng cao!', TRUE, NOW()),
            (1, 2, 4, 'Tốt, giao hàng nhanh', TRUE, NOW()),
            (2, 1, 5, 'Tuyệt vời! Sẽ mua lại', TRUE, NOW()),
            (3, 2, 3, 'Ổn, giá hợp lý', TRUE, NOW()),
            (4, 1, 5, 'Rất hài lòng với sản phẩm này', TRUE, NOW()),
            (5, 2, 4, 'Chất lượng tốt, đáng mua', TRUE, NOW())
        `);

        console.log('✅ Sample reviews added successfully');

        // Show table structure
        const [columns] = await connection.execute('DESCRIBE product_reviews');
        console.log('\n📋 Table structure:');
        columns.forEach(col => {
            console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
        });

        // Show sample data
        const [reviews] = await connection.execute(`
            SELECT r.*, u.first_name, u.last_name, p.name as product_name
            FROM product_reviews r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN products p ON r.product_id = p.id
            ORDER BY r.created_at DESC
            LIMIT 5
        `);

        console.log('\n📊 Sample reviews:');
        reviews.forEach(review => {
            console.log(`   ${review.product_name} - ${review.first_name} ${review.last_name}: ${review.rating}/5 - "${review.comment}"`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

createReviewsTable();
