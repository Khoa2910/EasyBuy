const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function checkTestUser() {
    let connection;
    
    try {
        console.log('🔍 Checking test user...');
        
        // Connect to database
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'easybuy'
        });
        
        // Get user info
        const [users] = await connection.execute(
            'SELECT id, email, first_name, last_name, password_hash, is_active FROM users WHERE email = ?',
            ['test@example.com']
        );
        
        if (users.length === 0) {
            console.log('❌ User not found');
            return;
        }
        
        const user = users[0];
        console.log('✅ User found:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
        console.log(`   Active: ${user.is_active}`);
        console.log(`   Password hash: ${user.password_hash ? 'Present' : 'Missing'}`);
        
        // Test password
        const testPassword = '123456';
        const isPasswordValid = await bcrypt.compare(testPassword, user.password_hash);
        console.log(`   Password '123456' valid: ${isPasswordValid}`);
        
        if (!isPasswordValid) {
            console.log('\n🔧 Updating password...');
            const newHashedPassword = await bcrypt.hash('123456', 10);
            await connection.execute(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [newHashedPassword, user.id]
            );
            console.log('✅ Password updated successfully!');
        }
        
    } catch (error) {
        console.error('❌ Error checking user:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkTestUser();
