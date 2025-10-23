const mysql = require('mysql2/promise');

async function createVouchersTables() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'easybuy'
    });

    try {
        console.log('🎫 Creating vouchers tables...');

        // Create vouchers table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS vouchers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                code VARCHAR(50) UNIQUE NOT NULL,
                discount_type ENUM('percentage', 'fixed') NOT NULL,
                discount_value DECIMAL(10,2) NOT NULL,
                minimum_amount DECIMAL(10,2) DEFAULT 0,
                maximum_discount DECIMAL(10,2) DEFAULT NULL,
                quantity_limit INT DEFAULT NULL,
                expires_at TIMESTAMP NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ vouchers table created successfully');

        // Create user_vouchers table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_vouchers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                voucher_id INT NOT NULL,
                is_used BOOLEAN DEFAULT FALSE,
                used_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_voucher (user_id, voucher_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ user_vouchers table created successfully');

        // Add sample vouchers
        console.log('📝 Adding sample vouchers...');
        
        await connection.execute(`
            INSERT IGNORE INTO vouchers (name, description, code, discount_type, discount_value, minimum_amount, maximum_discount, quantity_limit, expires_at, is_active)
            VALUES 
            ('Giảm 10% cho đơn hàng đầu tiên', 'Giảm 10% cho đơn hàng đầu tiên của khách hàng mới', 'WELCOME10', 'percentage', 10, 100000, 50000, 100, DATE_ADD(NOW(), INTERVAL 30 DAY), TRUE),
            ('Giảm 50k cho đơn hàng từ 500k', 'Giảm 50,000 VND cho đơn hàng từ 500,000 VND', 'SAVE50K', 'fixed', 50000, 500000, NULL, 50, DATE_ADD(NOW(), INTERVAL 15 DAY), TRUE),
            ('Giảm 20% cho đơn hàng từ 1 triệu', 'Giảm 20% cho đơn hàng từ 1,000,000 VND', 'VIP20', 'percentage', 20, 1000000, 200000, 20, DATE_ADD(NOW(), INTERVAL 7 DAY), TRUE),
            ('Miễn phí vận chuyển', 'Miễn phí vận chuyển cho mọi đơn hàng', 'FREESHIP', 'fixed', 30000, 0, 30000, 200, DATE_ADD(NOW(), INTERVAL 14 DAY), TRUE),
            ('Giảm 15% cho khách hàng thân thiết', 'Giảm 15% cho khách hàng thân thiết', 'LOYAL15', 'percentage', 15, 200000, 100000, 30, DATE_ADD(NOW(), INTERVAL 21 DAY), TRUE)
        `);

        console.log('✅ Sample vouchers added successfully');

        // Show table structures
        console.log('\n📋 Vouchers table structure:');
        const [voucherColumns] = await connection.execute('DESCRIBE vouchers');
        voucherColumns.forEach(col => {
            console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
        });

        console.log('\n📋 User_vouchers table structure:');
        const [userVoucherColumns] = await connection.execute('DESCRIBE user_vouchers');
        userVoucherColumns.forEach(col => {
            console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
        });

        // Show sample vouchers
        const [vouchers] = await connection.execute(`
            SELECT name, code, discount_type, discount_value, minimum_amount, expires_at
            FROM vouchers
            WHERE is_active = TRUE
            ORDER BY created_at DESC
            LIMIT 5
        `);

        console.log('\n🎫 Sample vouchers:');
        vouchers.forEach(voucher => {
            const discount = voucher.discount_type === 'percentage' 
                ? `${voucher.discount_value}%` 
                : `${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(voucher.discount_value)}`;
            console.log(`   ${voucher.name} (${voucher.code}): ${discount} - Min: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(voucher.minimum_amount)} - Expires: ${voucher.expires_at.toLocaleDateString('vi-VN')}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

createVouchersTables();
