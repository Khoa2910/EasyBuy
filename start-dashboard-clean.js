#!/usr/bin/env node

/**
 * Clean Dashboard Starter
 * Starts admin dashboard without Redis dependency
 */

const { spawn } = require('child_process');
const path = require('path');
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

function startCleanDashboard() {
    log('🚀 Starting Clean Admin Dashboard...', 'bright');
    log('================================================', 'bright');
    
    try {
        // Check if complete-server.js exists
        if (!fs.existsSync('complete-server.js')) {
            log('❌ complete-server.js not found!', 'red');
            log('Please make sure you are in the EasyBuy project root directory', 'yellow');
            process.exit(1);
        }
        
        log('📁 Starting complete server (with integrated dashboard)...', 'blue');
        
        const serverProcess = spawn('node', ['complete-server.js'], {
            stdio: 'inherit',
            shell: true,
            env: {
                ...process.env,
                NODE_ENV: 'development',
                // Disable Redis
                REDIS_HOST: '',
                REDIS_PORT: '',
                // MySQL settings
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
            log('🎉 Clean Admin Dashboard Started!', 'green');
            log('================================================', 'bright');
            log('📊 Dashboard URLs:', 'bright');
            log('   • Main Server: http://localhost:3000', 'cyan');
            log('   • Admin Dashboard: http://localhost:3000/admin-products.html', 'cyan');
            log('   • Statistics API: http://localhost:3000/api/admin/statistics', 'cyan');
            log('   • Health Check: http://localhost:3000/health', 'cyan');
            log('', 'reset');
            log('🔐 Login Info:', 'bright');
            log('   • Email: admin@tmdt.com', 'cyan');
            log('   • Password: admin123', 'cyan');
            log('', 'reset');
            log('📝 To stop the server, press Ctrl+C', 'yellow');
            log('================================================', 'bright');
        }, 5000);
        
    } catch (error) {
        log(`❌ Failed to start server: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Run the clean dashboard
if (require.main === module) {
    startCleanDashboard();
}

module.exports = { startCleanDashboard };
