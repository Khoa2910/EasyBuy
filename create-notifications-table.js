const mysql = require('mysql2/promise');

async function createNotificationsTable() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'easybuy'
    });

    try {
        console.log('🔔 Creating notifications table...');

        // Create notifications table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type ENUM('order', 'voucher', 'review', 'system') NOT NULL,
                message TEXT NOT NULL,
                reference_id INT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                read_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Add reference_id column if it doesn't exist
        try {
            await connection.execute(`
                ALTER TABLE notifications 
                ADD COLUMN reference_id INT NULL AFTER message
            `);
            console.log('✅ Added reference_id column');
        } catch (error) {
            if (error.code !== 'ER_DUP_FIELDNAME') {
                console.log('⚠️  reference_id column may already exist');
            }
        }

        console.log('✅ notifications table created successfully');

        // Add sample notifications
        console.log('📝 Adding sample notifications...');
        
        await connection.execute(`
            INSERT IGNORE INTO notifications (user_id, type, message, reference_id, created_at)
            VALUES 
            (1, 'order', 'Đơn hàng #EASY123456 đã được xác nhận', 1, NOW()),
            (1, 'voucher', 'Voucher "Giảm 10%" sắp hết hạn trong 3 ngày', 1, NOW()),
            (1, 'review', 'Bạn có thể đánh giá sản phẩm đã mua', NULL, NOW()),
            (2, 'order', 'Đơn hàng #EASY123457 đang được giao', 2, NOW()),
            (2, 'system', 'Chào mừng bạn đến với EasyBuy!', NULL, NOW())
        `);

        console.log('✅ Sample notifications added successfully');

        // Show table structure
        console.log('\n📋 Table structure:');
        const [columns] = await connection.execute('DESCRIBE notifications');
        columns.forEach(col => {
            console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
        });

        // Show sample data
        const [notifications] = await connection.execute(`
            SELECT n.*, u.first_name, u.last_name
            FROM notifications n
            LEFT JOIN users u ON n.user_id = u.id
            ORDER BY n.created_at DESC
            LIMIT 5
        `);

        console.log('\n🔔 Sample notifications:');
        notifications.forEach(notification => {
            console.log(`   ${notification.first_name} ${notification.last_name}: ${notification.message} (${notification.type})`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

createNotificationsTable();
