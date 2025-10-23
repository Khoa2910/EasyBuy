const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createTestUser() {
    let connection;
    
    try {
        console.log('🔧 Creating test user...');
        
        // Connect to database
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'easybuy'
        });
        
        // Check if user already exists
        const [existingUsers] = await connection.execute(
            'SELECT id, email FROM users WHERE email = ?',
            ['test@example.com']
        );
        
        if (existingUsers.length > 0) {
            console.log('✅ User test@example.com already exists');
            console.log(`   User ID: ${existingUsers[0].id}`);
            return;
        }
        
        // Create new user
        const hashedPassword = await bcrypt.hash('123456', 10);
        
        const [result] = await connection.execute(
            `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, is_active, is_email_verified, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                'test@example.com',
                hashedPassword,
                'Test',
                'User',
                '0123456789',
                'customer',
                true,
                true
            ]
        );
        
        console.log('✅ Test user created successfully!');
        console.log(`   User ID: ${result.insertId}`);
        console.log(`   Email: test@example.com`);
        console.log(`   Password: 123456`);
        console.log(`   Name: Test User`);
        
    } catch (error) {
        console.error('❌ Error creating test user:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createTestUser();
