const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function runTests() {
    console.log('🧪 Running EasyBuy tests...\n');

    try {
        // Test 1: Database connection
        console.log('1️⃣ Testing database connection...');
        await execAsync('node test-database.js');
        console.log('✅ Database test completed\n');

        // Test 2: Database initialization
        console.log('2️⃣ Initializing database...');
        await execAsync('node init-database.js');
        console.log('✅ Database initialization completed\n');

        // Test 3: Registration
        console.log('3️⃣ Testing user registration...');
        await execAsync('node test-registration.js');
        console.log('✅ Registration test completed\n');

        console.log('🎉 All tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

runTests();
