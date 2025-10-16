const mysql = require('mysql2/promise');

async function testDatabase() {
    console.log('🔍 Testing database connection with XAMPP...');
    
    // XAMPP default configuration
    const dbConfig = {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '', // XAMPP default has no password
        database: 'easybuy',
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
        const [tables] = await connection.execute("SHOW TABLES LIKE 'users'");
        if (tables.length === 0) {
            console.log('❌ Users table does not exist!');
            console.log('💡 Please run: node init-database-xampp.js');
        } else {
            console.log('✅ Users table exists!');
            
            // Check current users
            const [users] = await connection.execute("SELECT id, email, first_name, last_name, is_email_verified, is_active FROM users");
            console.log('👥 Current users in database:', users);
        }

        await connection.end();
        
    } catch (error) {
        console.error('❌ Database connection failed!');
        console.error('Error details:', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('💡 Check your database credentials. Make sure XAMPP MySQL is running.');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('💡 Database "easybuy" does not exist. Please run: node init-database-xampp.js');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('💡 MySQL server is not running. Please start XAMPP MySQL service.');
        }
    }
}

testDatabase();
