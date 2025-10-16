const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabaseConnection() {
    console.log('🔍 Testing database connection...');
    
    const dbConfig = {
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER || 'tmdt_user',
        password: process.env.MYSQL_PASSWORD || 'tmdt_password',
        database: process.env.MYSQL_DATABASE || 'easybuy',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };

    console.log('📋 Database config:', {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database
    });

    try {
        // Test connection
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Database connection successful!');

        // Check if users table exists
        const [tables] = await connection.execute(
            "SHOW TABLES LIKE 'users'"
        );
        
        if (tables.length > 0) {
            console.log('✅ Users table exists');
            
            // Check current users
            const [users] = await connection.execute(
                "SELECT id, email, first_name, last_name, created_at FROM users ORDER BY created_at DESC LIMIT 5"
            );
            
            console.log('👥 Current users in database:');
            users.forEach(user => {
                console.log(`  - ID: ${user.id}, Email: ${user.email}, Name: ${user.first_name} ${user.last_name}, Created: ${user.created_at}`);
            });
        } else {
            console.log('❌ Users table does not exist!');
        }

        await connection.end();
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Full error:', error);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Suggestion: Make sure MySQL is running');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('💡 Suggestion: Check username/password in .env file');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('💡 Suggestion: Database "easybuy" does not exist. Run database/init.sql');
        }
    }
}

testDatabaseConnection();
