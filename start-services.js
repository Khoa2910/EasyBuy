const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting EasyBuy Services...\n');

const services = [
    {
        name: 'API Gateway',
        command: 'node',
        args: ['server.js'],
        cwd: path.join(__dirname, 'api-gateway'),
        port: 3000
    },
    {
        name: 'User Service',
        command: 'node',
        args: ['server.js'],
        cwd: path.join(__dirname, 'services', 'user-service'),
        port: 3002
    },
    {
        name: 'Order Service',
        command: 'node',
        args: ['server.js'],
        cwd: path.join(__dirname, 'services', 'order-service'),
        port: 3004
    },
    {
        name: 'Product Service',
        command: 'node',
        args: ['server.js'],
        cwd: path.join(__dirname, 'services', 'product-service'),
        port: 3001
    },
    {
        name: 'Payment Service',
        command: 'node',
        args: ['server.js'],
        cwd: path.join(__dirname, 'services', 'payment-service'),
        port: 3003
    }
];

const processes = [];

// Start each service
services.forEach(service => {
    console.log(`📦 Starting ${service.name}...`);
    
    const process = spawn(service.command, service.args, {
        cwd: service.cwd,
        stdio: 'pipe',
        shell: true
    });

    process.stdout.on('data', (data) => {
        console.log(`[${service.name}] ${data.toString().trim()}`);
    });

    process.stderr.on('data', (data) => {
        console.error(`[${service.name}] ERROR: ${data.toString().trim()}`);
    });

    process.on('close', (code) => {
        console.log(`[${service.name}] Process exited with code ${code}`);
    });

    processes.push({
        name: service.name,
        process: process,
        port: service.port
    });
});

// Health check function
async function healthCheck() {
    console.log('\n🔍 Checking service health...');
    
    for (const service of processes) {
        try {
            const response = await fetch(`http://localhost:${service.port}/health`);
            if (response.ok) {
                console.log(`✅ ${service.name} is healthy`);
            } else {
                console.log(`❌ ${service.name} is not responding`);
            }
        } catch (error) {
            console.log(`❌ ${service.name} is not accessible: ${error.message}`);
        }
    }
}

// Wait a bit then check health
setTimeout(healthCheck, 5000);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down services...');
    
    processes.forEach(({ name, process: proc }) => {
        console.log(`📦 Stopping ${name}...`);
        proc.kill('SIGTERM');
    });
    
    setTimeout(() => {
        console.log('👋 All services stopped. Goodbye!');
        process.exit(0);
    }, 2000);
});

console.log('\n✨ All services started! Press Ctrl+C to stop all services.');
console.log('🌐 API Gateway: http://localhost:3000');
console.log('🛒 Frontend: http://localhost:3000 (served by API Gateway)');













