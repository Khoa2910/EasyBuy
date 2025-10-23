const EmailService = require('./services/email-service');

async function testEmailService() {
  console.log('🧪 Testing Email Service...');
  
  const emailService = new EmailService();
  
  // Test configuration
  console.log('\n📋 Email Service Configuration:');
  console.log(`   API Key: ${emailService.apiKey.substring(0, 10)}...`);
  console.log(`   From Email: ${emailService.fromEmail}`);
  console.log(`   From Name: ${emailService.fromName}`);
  
  // Test OTP email
  console.log('\n📧 Testing OTP Email...');
  const otpResult = await emailService.sendOTPEmail(
    'dangkhoa29102k2@gmail.com', 
    '123456', 
    'Nguyễn Khoa'
  );
  
  if (otpResult.success) {
    console.log('✅ OTP Email sent successfully!');
    console.log(`   Message ID: ${otpResult.messageId}`);
  } else {
    console.log('❌ OTP Email failed:');
    console.log(`   Error: ${otpResult.error}`);
  }
  
  // Test welcome email
  console.log('\n🎉 Testing Welcome Email...');
  const welcomeResult = await emailService.sendWelcomeEmail(
    'dangkhoa29102k2@gmail.com',
    'Nguyễn Khoa'
  );
  
  if (welcomeResult.success) {
    console.log('✅ Welcome Email sent successfully!');
    console.log(`   Message ID: ${welcomeResult.messageId}`);
  } else {
    console.log('❌ Welcome Email failed:');
    console.log(`   Error: ${welcomeResult.error}`);
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Check your email inbox');
  console.log('2. If not received, check spam folder');
  console.log('3. Verify SendGrid API key is correct');
  console.log('4. Check SendGrid dashboard for delivery status');
}

// Run the test
if (require.main === module) {
  testEmailService();
}

module.exports = { testEmailService };
