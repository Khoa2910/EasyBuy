const mysql = require('mysql2/promise');

async function createMessagingTables() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'easybuy'
    });

    try {
        console.log('💬 Creating messaging tables...');

        // Create conversations table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS conversations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                admin_id INT NULL,
                subject VARCHAR(255) NOT NULL,
                status ENUM('open', 'closed', 'pending') DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ conversations table created successfully');

        // Create messages table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                conversation_id INT NOT NULL,
                sender_id INT NOT NULL,
                content TEXT NOT NULL,
                message_type ENUM('text', 'image', 'file', 'product') DEFAULT 'text',
                is_read BOOLEAN DEFAULT FALSE,
                read_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ messages table created successfully');

        // Add sample conversations and messages
        console.log('📝 Adding sample conversations...');
        
        await connection.execute(`
            INSERT IGNORE INTO conversations (user_id, subject, status, created_at)
            VALUES 
            (1, 'Hỏi về sản phẩm nồi cơm điện', 'open', NOW()),
            (2, 'Tư vấn mua đồ gia dụng', 'open', NOW()),
            (1, 'Khiếu nại về đơn hàng', 'closed', NOW())
        `);

        // Get conversation IDs
        const [conversations] = await connection.execute('SELECT id FROM conversations ORDER BY id LIMIT 3');
        
        if (conversations.length > 0) {
            await connection.execute(`
                INSERT IGNORE INTO messages (conversation_id, sender_id, content, message_type, created_at)
                VALUES 
                (${conversations[0].id}, 1, 'Xin chào, tôi muốn hỏi về sản phẩm nồi cơm điện có giá tốt không?', 'text', NOW()),
                (${conversations[0].id}, 1, 'Tôi đang tìm nồi cơm điện dung tích 1.8L, có sản phẩm nào phù hợp không?', 'text', NOW()),
                (${conversations[1].id}, 2, 'Chào admin, tôi cần tư vấn về bộ dao nhà bếp', 'text', NOW()),
                (${conversations[1].id}, 2, 'Bộ dao nào chất lượng tốt và giá hợp lý?', 'text', NOW()),
                (${conversations[2].id}, 1, 'Đơn hàng của tôi bị giao sai sản phẩm', 'text', NOW())
            `);
        }

        console.log('✅ Sample conversations and messages added successfully');

        // Show table structures
        console.log('\n📋 Conversations table structure:');
        const [conversationColumns] = await connection.execute('DESCRIBE conversations');
        conversationColumns.forEach(col => {
            console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
        });

        console.log('\n📋 Messages table structure:');
        const [messageColumns] = await connection.execute('DESCRIBE messages');
        messageColumns.forEach(col => {
            console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
        });

        // Show sample data
        const [sampleData] = await connection.execute(`
            SELECT 
                c.id as conversation_id,
                c.subject,
                c.status,
                u.first_name,
                u.last_name,
                COUNT(m.id) as message_count
            FROM conversations c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN messages m ON c.id = m.conversation_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
            LIMIT 3
        `);

        console.log('\n💬 Sample conversations:');
        sampleData.forEach(conv => {
            console.log(`   #${conv.conversation_id}: ${conv.subject} - ${conv.first_name} ${conv.last_name} (${conv.status}) - ${conv.message_count} messages`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

createMessagingTables();
