// Script tạo tài khoản test để kiểm tra đăng nhập
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createTestUser() {
    try {
        // Kết nối database
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '', // Thay đổi nếu có password
            database: 'easybuy'
        });

        console.log('✅ Kết nối database thành công');

        // Tạo user test
        const email = 'dangkhoa29102k2@gmail.com';
        const password = 'password123';
        const firstName = 'Dang';
        const lastName = 'Khoa';
        const phone = '0123456789';

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Kiểm tra user đã tồn tại chưa
        const [existingUsers] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            console.log('⚠️ User đã tồn tại, cập nhật password...');
            await connection.execute(
                'UPDATE users SET password_hash = ?, first_name = ?, last_name = ?, phone = ?, is_active = 1 WHERE email = ?',
                [passwordHash, firstName, lastName, phone, email]
            );
        } else {
            console.log('➕ Tạo user mới...');
            await connection.execute(
                'INSERT INTO users (email, password_hash, first_name, last_name, phone, is_email_verified, is_active, role, created_at) VALUES (?, ?, ?, ?, ?, 1, 1, "customer", NOW())',
                [email, passwordHash, firstName, lastName, phone]
            );
        }

        console.log('✅ Tạo/cập nhật user thành công!');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);

        await connection.end();
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    }
}

createTestUser();

