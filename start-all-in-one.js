#!/usr/bin/env node

/**
 * All-in-One EasyBuy Server Starter
 * Starts everything with just one command
 */

const { spawn } = require('child_process');
const fs = require('fs');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function startAllInOne() {
    log('🚀 Starting EasyBuy All-in-One Server...', 'bright');
    log('================================================', 'bright');
    
    try {
        // Check if complete-server.js exists
        if (!fs.existsSync('complete-server.js')) {
            log('❌ complete-server.js not found!', 'red');
            log('Please make sure you are in the EasyBuy project root directory', 'yellow');
            process.exit(1);
        }
        
        log('📁 Starting integrated server with dashboard...', 'blue');
        
        const serverProcess = spawn('node', ['complete-server.js'], {
            stdio: 'inherit',
            shell: true,
            env: {
                ...process.env,
                NODE_ENV: 'development',
                // Database settings
                MYSQL_HOST: 'localhost',
                MYSQL_PORT: '3306',
                MYSQL_USER: 'root',
                MYSQL_PASSWORD: '',
                MYSQL_DATABASE: 'easybuy',
                JWT_SECRET: 'your-secret-key'
            }
        });
        
        serverProcess.on('error', (error) => {
            log(`❌ Server error: ${error.message}`, 'red');
        });
        
        serverProcess.on('exit', (code) => {
            if (code !== 0) {
                log(`❌ Server exited with code ${code}`, 'red');
            } else {
                log('✅ Server stopped gracefully', 'green');
            }
        });
        
        // Handle process termination
        process.on('SIGINT', () => {
            log('\n🛑 Stopping server...', 'yellow');
            serverProcess.kill('SIGTERM');
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            log('\n🛑 Stopping server (SIGTERM)...', 'yellow');
            serverProcess.kill('SIGTERM');
            process.exit(0);
        });
        
        // Wait a bit and show URLs
        setTimeout(() => {
            log('', 'reset');
            log('🎉 EasyBuy All-in-One Server Started!', 'green');
            log('================================================', 'bright');
            log('🌐 Main URLs:', 'bright');
            log('   • Main Server: http://localhost:3000', 'cyan');
            log('   • Admin Dashboard: http://localhost:3000/admin-products.html', 'cyan');
            log('   • Health Check: http://localhost:3000/health', 'cyan');
            log('', 'reset');
            log('📊 Dashboard APIs:', 'bright');
            log('   • Statistics: http://localhost:3000/api/admin/statistics', 'cyan');
            log('   • Orders: http://localhost:3000/api/admin/orders', 'cyan');
            log('   • Products: http://localhost:3000/api/admin/products', 'cyan');
            log('   • Users: http://localhost:3000/api/admin/users', 'cyan');
            log('', 'reset');
            log('🔐 Admin Login:', 'bright');
            log('   • Email: admin@tmdt.com', 'cyan');
            log('   • Password: admin123', 'cyan');
            log('', 'reset');
            log('📝 To stop the server, press Ctrl+C', 'yellow');
            log('================================================', 'bright');
        }, 3000);
        
    } catch (error) {
        log(`❌ Failed to start server: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Run the all-in-one server
if (require.main === module) {
    startAllInOne();
}

module.exports = { startAllInOne };
