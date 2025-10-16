const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 ===== EASYBUY SETUP - STEP BY STEP =====\n');

// Step 1: Check if port 3000 is free
console.log('📋 STEP 1: Checking port 3000...');
const netstat = spawn('netstat', ['-ano'], { shell: true });

let port3000InUse = false;
netstat.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes(':3000')) {
    console.log('⚠️  Port 3000 is in use:');
    console.log(output.split('\n').filter(line => line.includes(':3000')).join('\n'));
    port3000InUse = true;
  }
});

netstat.on('close', (code) => {
  if (!port3000InUse) {
    console.log('✅ Port 3000 is free\n');
  } else {
    console.log('❌ Port 3000 is in use. Please kill the process first.\n');
  }
  
  // Step 2: Test database connection
  console.log('📋 STEP 2: Testing database connection...');
  testDatabase();
});

function testDatabase() {
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
      
      // Test query
      return connection.execute('SELECT COUNT(*) as count FROM users');
    })
    .then(([rows]) => {
      console.log(`📊 Total users in database: ${rows[0].count}`);
      
      // Check admin user
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
      
      // Step 3: Start server
      console.log('📋 STEP 3: Starting simple server...');
      startServer();
    })
    .catch(error => {
      console.error('❌ Database test failed:', error.message);
      console.log('❌ Please check XAMPP MySQL is running\n');
    });
}

function startServer() {
  console.log('🚀 Starting server in api-gateway directory...');
  
  const server = spawn('node', ['simple-server.js'], {
    cwd: path.join(__dirname, 'api-gateway'),
    stdio: 'inherit',
    shell: true
  });
  
  server.on('error', (error) => {
    console.error('❌ Failed to start server:', error.message);
  });
  
  server.on('close', (code) => {
    console.log(`📋 Server process exited with code ${code}`);
  });
  
  // Step 4: Wait and test
  setTimeout(() => {
    console.log('\n📋 STEP 4: Testing server endpoints...');
    testEndpoints();
  }, 3000);
}

function testEndpoints() {
  const http = require('http');
  
  // Test health endpoint
  console.log('🔍 Testing health endpoint...');
  const healthReq = http.get('http://localhost:3000/health', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('✅ Health check response:', data);
      
      // Test registration
      console.log('\n🔍 Testing registration endpoint...');
      testRegistration();
    });
  });
  
  healthReq.on('error', (error) => {
    console.error('❌ Health check failed:', error.message);
  });
}

function testRegistration() {
  const http = require('http');
  
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
        
        // Test login
        console.log('\n🔍 Testing login endpoint...');
        testLogin();
      } else {
        console.log('❌ Registration test failed');
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Registration request failed:', error.message);
  });
  
  req.write(postData);
  req.end();
}

function testLogin() {
  const http = require('http');
  
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
        console.log('\n🎉 ===== ALL TESTS COMPLETED SUCCESSFULLY =====');
        console.log('🌐 Frontend: http://localhost:3000');
        console.log('📝 Register: http://localhost:3000/register.html');
        console.log('🔐 Login: http://localhost:3000/login.html');
      } else {
        console.log('❌ Login test failed');
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Login request failed:', error.message);
  });
  
  req.write(postData);
  req.end();
}

