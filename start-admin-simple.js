#!/usr/bin/env node

/**
 * Simple Admin Dashboard Starter
 * Starts admin service without Redis dependency
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

function startAdminService() {
    log('🚀 Starting Admin Dashboard Service (Simple Mode)...', 'bright');
    log('================================================', 'bright');
    
    try {
        // Check if admin service directory exists
        if (!fs.existsSync('./services/admin-service')) {
            log('❌ Admin service directory not found!', 'red');
            log('Please make sure you are in the EasyBuy project root directory', 'yellow');
            process.exit(1);
        }
        
        log('📁 Starting admin service...', 'blue');
        
        const adminProcess = spawn('node', ['server.js'], {
            cwd: './services/admin-service',
            stdio: 'inherit',
            shell: true,
            env: {
                ...process.env,
                NODE_ENV: 'development',
                REDIS_HOST: 'localhost',
                REDIS_PORT: '6379',
                MYSQL_HOST: 'localhost',
                MYSQL_PORT: '3306',
                MYSQL_USER: 'root',
                MYSQL_PASSWORD: '',
                MYSQL_DATABASE: 'easybuy',
                JWT_SECRET: 'your-secret-key'
            }
        });
        
        adminProcess.on('error', (error) => {
            log(`❌ Admin service error: ${error.message}`, 'red');
        });
        
        adminProcess.on('exit', (code) => {
            if (code !== 0) {
                log(`❌ Admin service exited with code ${code}`, 'red');
            } else {
                log('✅ Admin service stopped gracefully', 'green');
            }
        });
        
        // Handle process termination
        process.on('SIGINT', () => {
            log('\n🛑 Stopping admin service...', 'yellow');
            adminProcess.kill('SIGTERM');
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            log('\n🛑 Stopping admin service (SIGTERM)...', 'yellow');
            adminProcess.kill('SIGTERM');
            process.exit(0);
        });
        
        // Wait a bit and show URLs
        setTimeout(() => {
            log('', 'reset');
            log('🎉 Admin Dashboard Service Started!', 'green');
            log('================================================', 'bright');
            log('📊 Dashboard URLs:', 'bright');
            log('   • Admin Service: http://localhost:3005', 'cyan');
            log('   • Statistics API: http://localhost:3005/statistics', 'cyan');
            log('   • Health Check: http://localhost:3005/health', 'cyan');
            log('', 'reset');
            log('🌐 Frontend URLs:', 'bright');
            log('   • Admin Dashboard: http://localhost:3000/admin-products.html', 'cyan');
            log('   • Main Server: http://localhost:3000', 'cyan');
            log('', 'reset');
            log('📝 To stop the service, press Ctrl+C', 'yellow');
            log('================================================', 'bright');
        }, 3000);
        
    } catch (error) {
        log(`❌ Failed to start admin service: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Run the admin service
if (require.main === module) {
    startAdminService();
}

module.exports = { startAdminService };
