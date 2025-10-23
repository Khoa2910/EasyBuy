#!/usr/bin/env node

/**
 * Start Dashboard Script
 * Starts all services needed for the admin dashboard
 */

const { spawn, exec } = require('child_process');
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

// Service configurations
const services = [
    {
        name: 'MySQL Database',
        command: 'docker',
        args: ['run', '--rm', '-d', '--name', 'tmdt_mysql', '-p', '3306:3306', 
               '-e', 'MYSQL_ROOT_PASSWORD=rootpassword', '-e', 'MYSQL_DATABASE=easybuy',
               '-e', 'MYSQL_USER=tmdt_user', '-e', 'MYSQL_PASSWORD=tmdt_password',
               'mysql:8.0'],
        port: 3306,
        healthCheck: 'mysql -h localhost -u tmdt_user -ptmdt_password -e "SELECT 1"'
    },
    {
        name: 'Redis Cache',
        command: 'docker',
        args: ['run', '--rm', '-d', '--name', 'tmdt_redis', '-p', '6379:6379', 'redis:7-alpine'],
        port: 6379,
        healthCheck: 'redis-cli ping'
    },
    {
        name: 'API Gateway',
        command: 'node',
        args: ['server.js'],
        cwd: './api-gateway',
        port: 3000,
        healthCheck: 'curl -f http://localhost:3000/health'
    },
    {
        name: 'Auth Service',
        command: 'node',
        args: ['server.js'],
        cwd: './services/auth-service',
        port: 3001,
        healthCheck: 'curl -f http://localhost:3001/health'
    },
    {
        name: 'User Service',
        command: 'node',
        args: ['server.js'],
        cwd: './services/user-service',
        port: 3002,
        healthCheck: 'curl -f http://localhost:3002/health'
    },
    {
        name: 'Product Service',
        command: 'node',
        args: ['server.js'],
        cwd: './services/product-service',
        port: 3003,
        healthCheck: 'curl -f http://localhost:3003/health'
    },
    {
        name: 'Payment Service',
        command: 'node',
        args: ['server.js'],
        cwd: './services/payment-service',
        port: 3004,
        healthCheck: 'curl -f http://localhost:3004/health'
    },
    {
        name: 'Admin Service',
        command: 'node',
        args: ['server.js'],
        cwd: './services/admin-service',
        port: 3005,
        healthCheck: 'curl -f http://localhost:3005/health'
    },
    {
        name: 'Order Service',
        command: 'node',
        args: ['server.js'],
        cwd: './services/order-service',
        port: 3008,
        healthCheck: 'curl -f http://localhost:3008/health'
    },
    {
        name: 'Notification Service',
        command: 'node',
        args: ['server.js'],
        cwd: './services/notification-service',
        port: 3009,
        healthCheck: 'curl -f http://localhost:3009/health'
    }
];

// Track running processes
const runningProcesses = new Map();

// Logging function
function log(message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// Check if port is available
function checkPort(port) {
    return new Promise((resolve) => {
        const net = require('net');
        const server = net.createServer();
        
        server.listen(port, () => {
            server.once('close', () => resolve(true));
            server.close();
        });
        
        server.on('error', () => resolve(false));
    });
}

// Wait for service to be healthy
async function waitForService(service, maxAttempts = 30) {
    log(`Waiting for ${service.name} to be healthy...`, 'yellow');
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await new Promise((resolve, reject) => {
                exec(service.healthCheck, (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
            
            log(`${service.name} is healthy!`, 'green');
            return true;
        } catch (error) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    log(`${service.name} failed to start within timeout`, 'red');
    return false;
}

// Start a service
async function startService(service) {
    try {
        log(`Starting ${service.name}...`, 'blue');
        
        // Check if port is available
        const portAvailable = await checkPort(service.port);
        if (!portAvailable) {
            log(`Port ${service.port} is already in use for ${service.name}`, 'yellow');
            return true;
        }
        
        // Start the service
        const process = spawn(service.command, service.args, {
            cwd: service.cwd || process.cwd(),
            stdio: 'pipe',
            shell: true
        });
        
        runningProcesses.set(service.name, process);
        
        // Handle process output
        process.stdout.on('data', (data) => {
            log(`[${service.name}] ${data.toString().trim()}`, 'cyan');
        });
        
        process.stderr.on('data', (data) => {
            log(`[${service.name}] ERROR: ${data.toString().trim()}`, 'red');
        });
        
        process.on('exit', (code) => {
            if (code !== 0) {
                log(`${service.name} exited with code ${code}`, 'red');
            }
            runningProcesses.delete(service.name);
        });
        
        // Wait for service to be healthy
        await new Promise(resolve => setTimeout(resolve, 3000)); // Give service time to start
        const isHealthy = await waitForService(service);
        
        return isHealthy;
    } catch (error) {
        log(`Error starting ${service.name}: ${error.message}`, 'red');
        return false;
    }
}

// Stop all services
function stopAllServices() {
    log('Stopping all services...', 'yellow');
    
    runningProcesses.forEach((process, name) => {
        log(`Stopping ${name}...`, 'yellow');
        process.kill('SIGTERM');
    });
    
    // Stop Docker containers
    exec('docker stop tmdt_mysql tmdt_redis 2>/dev/null || true', (error) => {
        if (error) {
            log('Error stopping Docker containers', 'red');
        } else {
            log('Docker containers stopped', 'green');
        }
    });
    
    runningProcesses.clear();
}

// Handle process termination
process.on('SIGINT', () => {
    log('\nReceived SIGINT, stopping all services...', 'yellow');
    stopAllServices();
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('\nReceived SIGTERM, stopping all services...', 'yellow');
    stopAllServices();
    process.exit(0);
});

// Main function
async function main() {
    log('🚀 Starting EasyBuy Admin Dashboard Services...', 'bright');
    log('================================================', 'bright');
    
    // Check if required directories exist
    const requiredDirs = [
        'api-gateway',
        'services/auth-service',
        'services/user-service',
        'services/product-service',
        'services/payment-service',
        'services/admin-service',
        'services/order-service',
        'services/notification-service'
    ];
    
    for (const dir of requiredDirs) {
        if (!fs.existsSync(dir)) {
            log(`❌ Required directory not found: ${dir}`, 'red');
            process.exit(1);
        }
    }
    
    // Start services in order
    const criticalServices = services.slice(0, 2); // MySQL and Redis first
    const microservices = services.slice(2);
    
    log('Starting critical services...', 'blue');
    for (const service of criticalServices) {
        const success = await startService(service);
        if (!success) {
            log(`❌ Failed to start ${service.name}`, 'red');
            process.exit(1);
        }
    }
    
    // Wait a bit for databases to be ready
    log('Waiting for databases to be ready...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    log('Starting microservices...', 'blue');
    for (const service of microservices) {
        const success = await startService(service);
        if (!success) {
            log(`⚠️  ${service.name} may not be fully functional`, 'yellow');
        }
    }
    
    log('================================================', 'bright');
    log('✅ All services started!', 'green');
    log('', 'reset');
    log('📊 Admin Dashboard URLs:', 'bright');
    log('   • Dashboard: http://localhost:3000/admin-dashboard.html', 'cyan');
    log('   • API Gateway: http://localhost:3000', 'cyan');
    log('   • Health Check: http://localhost:3000/health', 'cyan');
    log('', 'reset');
    log('🔧 Service URLs:', 'bright');
    services.forEach(service => {
        log(`   • ${service.name}: http://localhost:${service.port}`, 'cyan');
    });
    log('', 'reset');
    log('📝 To stop all services, press Ctrl+C', 'yellow');
    log('================================================', 'bright');
    
    // Keep the process alive
    setInterval(() => {
        // Check if any critical services have died
        const criticalProcesses = ['MySQL Database', 'Redis Cache', 'API Gateway'];
        for (const name of criticalProcesses) {
            if (!runningProcesses.has(name)) {
                log(`⚠️  ${name} is not running!`, 'yellow');
            }
        }
    }, 30000); // Check every 30 seconds
}

// Run the main function
if (require.main === module) {
    main().catch(error => {
        log(`❌ Fatal error: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { startService, stopAllServices };


