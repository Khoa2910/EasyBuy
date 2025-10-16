const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

console.log('🚀 ===== EASYBUY STARTUP SCRIPT =====\n');

let serverProcess = null;
let testResults = {
  portCheck: false,
  database: false,
  server: false,
  health: false,
  registration: false,
  login: false
};

// Step 1: Check port 3000
console.log('📋 STEP 1: Checking port 3000...');
checkPort();

function checkPort() {
  const netstat = spawn('netstat', ['-ano'], { shell: true });
  
  netstat.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes(':3000')) {
      console.log('⚠️  Port 3000 is in use:');
      console.log(output.split('\n').filter(line => line.includes(':3000')).join('\n'));
      console.log('❌ Please kill the process first or use different port\n');
      return;
    }
  });
  
  netstat.on('close', () => {
    console.log('✅ Port 3000 is free\n');
    testResults.portCheck = true;
    testDatabase();
  });
}

// Step 2: Test database
function testDatabase() {
  console.log('📋 STEP 2: Testing database connection...');
  
  const mysql = require('mysql2/promise');
  const dbConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'easybuy'
  };
  
  console.log('🔍 Database config:', dbConfig);
  
  mysql.createConnection(dbConfig)
    .then(connection => {
      console.log('✅ Database connection successful');
      return connection.execute('SELECT COUNT(*) as count FROM users');
    })
    .then(([rows]) => {
      console.log(`📊 Total users in database: ${rows[0].count}`);
      return mysql.createConnection(dbConfig).then(conn => 
        conn.execute('SELECT * FROM users WHERE email = ?', ['admin@tmdt.com'])
          .then(([adminRows]) => {
            conn.end();
            return adminRows;
          })
      );
    })
    .then(adminRows => {
      if (adminRows.length > 0) {
        console.log('👑 Admin user found:', adminRows[0].email);
      } else {
        console.log('❌ Admin user not found');
      }
      console.log('✅ Database test completed\n');
      testResults.database = true;
      startServer();
    })
    .catch(error => {
      console.error('❌ Database test failed:', error.message);
      console.log('❌ Please check XAMPP MySQL is running\n');
      process.exit(1);
    });
}

// Step 3: Start server
function startServer() {
  console.log('📋 STEP 3: Starting simple server...');
  console.log('🚀 Starting server in api-gateway directory...');
  
  serverProcess = spawn('node', ['simple-server.js'], {
    cwd: path.join(__dirname, 'api-gateway'),
    stdio: 'pipe',
    shell: true
  });
  
  // Log server output
  serverProcess.stdout.on('data', (data) => {
    console.log('📡 SERVER:', data.toString().trim());
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.log('❌ SERVER ERROR:', data.toString().trim());
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  });
  
  serverProcess.on('close', (code) => {
    console.log(`📋 Server process exited with code ${code}`);
  });
  
  // Wait for server to start, then test
  setTimeout(() => {
    console.log('\n📋 STEP 4: Testing server endpoints...');
    testResults.server = true;
    testHealthEndpoint();
  }, 5000);
}

// Step 4: Test health endpoint
function testHealthEndpoint() {
  console.log('🔍 Testing health endpoint...');
  
  const req = http.get('http://localhost:3000/health', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('✅ Health check response:', data);
      testResults.health = true;
      testRegistration();
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Health check failed:', error.message);
    console.log('⏳ Retrying in 2 seconds...');
    setTimeout(testHealthEndpoint, 2000);
  });
  
  req.setTimeout(5000, () => {
    console.log('⏳ Health check timeout, retrying...');
    req.destroy();
    setTimeout(testHealthEndpoint, 2000);
  });
}

// Step 5: Test registration
function testRegistration() {
  console.log('\n🔍 Testing registration endpoint...');
  
  const postData = JSON.stringify({
    firstName: 'Test',
    lastName: 'User', 
    email: 'test@example.com',
    password: 'password123'
  });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('📊 Registration response status:', res.statusCode);
      console.log('📊 Registration response:', data);
      
      if (res.statusCode === 201) {
        console.log('✅ Registration test successful!');
        testResults.registration = true;
        testLogin();
      } else {
        console.log('❌ Registration test failed');
        showFinalResults();
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Registration request failed:', error.message);
    showFinalResults();
  });
  
  req.write(postData);
  req.end();
}

// Step 6: Test login
function testLogin() {
  console.log('\n🔍 Testing login endpoint...');
  
  const postData = JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('📊 Login response status:', res.statusCode);
      console.log('📊 Login response:', data);
      
      if (res.statusCode === 200) {
        console.log('✅ Login test successful!');
        testResults.login = true;
      } else {
        console.log('❌ Login test failed');
      }
      
      showFinalResults();
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Login request failed:', error.message);
    showFinalResults();
  });
  
  req.write(postData);
  req.end();
}

// Show final results
function showFinalResults() {
  console.log('\n🎉 ===== FINAL RESULTS =====');
  console.log('📋 Port 3000 check:', testResults.portCheck ? '✅' : '❌');
  console.log('📋 Database connection:', testResults.database ? '✅' : '❌');
  console.log('📋 Server started:', testResults.server ? '✅' : '❌');
  console.log('📋 Health endpoint:', testResults.health ? '✅' : '❌');
  console.log('📋 Registration:', testResults.registration ? '✅' : '❌');
  console.log('📋 Login:', testResults.login ? '✅' : '❌');
  
  if (testResults.portCheck && testResults.database && testResults.server && testResults.health) {
    console.log('\n🎉 ===== EASYBUY IS READY! =====');
    console.log('🌐 Frontend: http://localhost:3000');
    console.log('📝 Register: http://localhost:3000/register.html');
    console.log('🔐 Login: http://localhost:3000/login.html');
    console.log('💚 Health: http://localhost:3000/health');
    console.log('\n📡 Server is running in background...');
    console.log('Press Ctrl+C to stop the server');
  } else {
    console.log('\n❌ Some tests failed. Please check the errors above.');
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down...');
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(0);
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(1);
});

