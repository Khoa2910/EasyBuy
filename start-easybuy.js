const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting EasyBuy - All-in-One Server...');
console.log('📁 Working directory:', process.cwd());
console.log('📄 Server file: complete-server.js');
console.log('');

// Start the complete server
const server = spawn('node', ['complete-server.js'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
});

// Handle server events
server.on('error', (error) => {
    console.error('❌ Error starting server:', error);
});

server.on('exit', (code) => {
    if (code !== 0) {
        console.error(`❌ Server exited with code ${code}`);
    } else {
        console.log('✅ Server stopped gracefully');
    }
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down EasyBuy Server...');
    server.kill('SIGTERM');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down EasyBuy Server...');
    server.kill('SIGTERM');
    process.exit(0);
});

console.log('✅ EasyBuy Server started!');
console.log('🌐 Open: http://localhost:3000');
console.log('🛑 Press Ctrl+C to stop');