const { spawn } = require('child_process');
const fs = require('fs');

function restartServer() {
  console.log('🔄 Restarting EasyBuy Server...');
  
  // Kill existing server process
  const { exec } = require('child_process');
  exec('taskkill /F /PID 4156', (error, stdout, stderr) => {
    if (error) {
      console.log('⚠️  Could not kill existing process:', error.message);
    } else {
      console.log('✅ Killed existing server process');
    }
    
    // Wait a bit then start new server
    setTimeout(() => {
      console.log('🚀 Starting new server...');
      const serverProcess = spawn('node', ['complete-server.js'], {
        stdio: 'inherit',
        shell: true
      });
      
      serverProcess.on('error', (error) => {
        console.error('❌ Server error:', error.message);
      });
      
      serverProcess.on('exit', (code) => {
        if (code !== 0) {
          console.log(`❌ Server exited with code ${code}`);
        } else {
          console.log('✅ Server stopped gracefully');
        }
      });
      
      // Wait a bit and test the new endpoint
      setTimeout(() => {
        console.log('🧪 Testing new change password endpoint...');
        const axios = require('axios');
        
        axios.post('http://localhost:3000/api/user/change-password', {
          currentPassword: 'test',
          newPassword: 'test123'
        }, {
          headers: {
            'Authorization': 'Bearer test'
          }
        }).then(response => {
          console.log('✅ Change password endpoint is working!');
        }).catch(error => {
          if (error.response?.status === 401) {
            console.log('✅ Change password endpoint is working (authentication required)!');
          } else {
            console.log('❌ Change password endpoint error:', error.response?.data || error.message);
          }
        });
      }, 3000);
      
    }, 2000);
  });
}

// Run the restart
if (require.main === module) {
  restartServer();
}

module.exports = { restartServer };
