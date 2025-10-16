const mysql = require('mysql2/promise');

async function checkUser() {
    console.log('🔍 Checking specific user...');
    
    const dbConfig = {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'easybuy'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Check for the specific user
        const [users] = await connection.execute(
            'SELECT id, email, first_name, last_name, is_email_verified, is_active, created_at FROM users WHERE email = ?',
            ['dangkhoa29102k2@gmail.com']
        );
        
        if (users.length > 0) {
            console.log('✅ User found in database:');
            console.log(users[0]);
        } else {
            console.log('❌ User not found in database');
            
            // Check all users with similar email
            const [allUsers] = await connection.execute(
                'SELECT id, email, first_name, last_name FROM users WHERE email LIKE ?',
                ['%dangkhoa%']
            );
            
            if (allUsers.length > 0) {
                console.log('🔍 Similar users found:');
                console.log(allUsers);
            } else {
                console.log('🔍 No similar users found');
            }
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Error checking user:', error.message);
    }
}

checkUser();
