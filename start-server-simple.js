#!/usr/bin/env node

/**
 * Simple Server Starter
 * Starts the complete server without Redis dependency
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

function startServer() {
    log('🚀 Starting EasyBuy Server (Simple Mode)...', 'bright');
    log('================================================', 'bright');
    
    try {
        // Check if complete-server.js exists
        if (!fs.existsSync('complete-server.js')) {
            log('❌ complete-server.js not found!', 'red');
            process.exit(1);
        }
        
        log('📁 Starting complete-server.js...', 'blue');
        
        const serverProcess = spawn('node', ['complete-server.js'], {
            stdio: 'inherit',
            shell: true
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
        
    } catch (error) {
        log(`❌ Failed to start server: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Run the server
if (require.main === module) {
    startServer();
}

module.exports = { startServer };


