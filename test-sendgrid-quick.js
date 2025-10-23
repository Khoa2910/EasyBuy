require('dotenv').config();

console.log('🧪 Testing SendGrid Configuration...');
console.log('=====================================');

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log(`   SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET'}`);
console.log(`   FROM_EMAIL: ${process.env.FROM_EMAIL || 'NOT SET'}`);
console.log(`   FROM_NAME: ${process.env.FROM_NAME || 'NOT SET'}`);

// Check API key format
if (process.env.SENDGRID_API_KEY) {
  if (process.env.SENDGRID_API_KEY.startsWith('SG.')) {
    console.log('✅ API Key format is correct (starts with SG.)');
  } else {
    console.log('❌ API Key format is incorrect (should start with SG.)');
    console.log(`   Current: ${process.env.SENDGRID_API_KEY.substring(0, 10)}...`);
  }
} else {
  console.log('❌ SENDGRID_API_KEY is not set in .env file');
}

console.log('\n📝 Next Steps:');
console.log('1. Get your SendGrid API key from: https://app.sendgrid.com/settings/api_keys');
console.log('2. Update .env file with your real API key');
console.log('3. Restart server: node complete-server.js');
console.log('4. Test: node test-email-service.js');

console.log('\n🔗 Quick Links:');
console.log('   • SendGrid Dashboard: https://app.sendgrid.com/');
console.log('   • API Keys: https://app.sendgrid.com/settings/api_keys');
console.log('   • Setup Guide: SENDGRID_SETUP_QUICK.md');
