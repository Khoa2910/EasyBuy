const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
    console.log('🚀 Initializing database...');
    
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

    try {
        // Connect to MySQL (without database)
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password
        });

        console.log('✅ Connected to MySQL server');

        // Create database if not exists
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
        console.log(`✅ Database '${dbConfig.database}' created/verified`);

        // Use the database
        await connection.execute(`USE \`${dbConfig.database}\``);

        // Create users table
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                is_email_verified BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                role ENUM('customer', 'admin', 'moderator') DEFAULT 'customer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;

        await connection.execute(createUsersTable);
        console.log('✅ Users table created/verified');

        // Create refresh_tokens table
        const createRefreshTokensTable = `
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;

        await connection.execute(createRefreshTokensTable);
        console.log('✅ Refresh tokens table created/verified');

        // Insert admin user if not exists
        const [adminUsers] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            ['admin@tmdt.com']
        );

        if (adminUsers.length === 0) {
            const bcrypt = require('bcryptjs');
            const adminPasswordHash = await bcrypt.hash('admin123', 12);
            
            await connection.execute(
                `INSERT INTO users (email, password_hash, first_name, last_name, is_email_verified, is_active, role) 
                 VALUES (?, ?, ?, ?, TRUE, TRUE, 'admin')`,
                ['admin@tmdt.com', adminPasswordHash, 'Admin', 'User']
            );
            console.log('✅ Admin user created');
        } else {
            console.log('✅ Admin user already exists');
        }

        await connection.end();
        console.log('🎉 Database initialization completed successfully!');

    } catch (error) {
        console.error('❌ Database initialization failed!');
        console.error('Error details:', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('💡 Check your database credentials in .env file');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('💡 MySQL server is not running. Please start MySQL service.');
        }
    }
}

initDatabase();
