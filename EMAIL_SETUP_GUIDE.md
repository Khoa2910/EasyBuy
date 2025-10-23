# Hướng dẫn thiết lập Email Service với SendGrid

## 📧 Thiết lập SendGrid

### Bước 1: Tạo tài khoản SendGrid
1. Truy cập: https://sendgrid.com/
2. Đăng ký tài khoản miễn phí (100 emails/ngày)
3. Xác thực email và số điện thoại

### Bước 2: Tạo API Key
1. Đăng nhập vào SendGrid Dashboard
2. Vào **Settings** > **API Keys**
3. Click **Create API Key**
4. Chọn **Restricted Access**
5. Cấp quyền **Mail Send** > **Full Access**
6. Copy API Key (bắt đầu với `SG.`)

### Bước 3: Cấu hình trong project

#### Cách 1: Sử dụng file .env (khuyến nghị)
1. Tạo file `.env` trong thư mục gốc:
```bash
# Email Configuration
SENDGRID_API_KEY=SG.your-actual-api-key-here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=EasyBuy
```

2. Cài đặt dotenv:
```bash
npm install dotenv
```

3. Thêm vào đầu `complete-server.js`:
```javascript
require('dotenv').config();
```

#### Cách 2: Sử dụng biến môi trường
```bash
# Windows
set SENDGRID_API_KEY=SG.your-actual-api-key-here
set FROM_EMAIL=noreply@yourdomain.com
set FROM_NAME=EasyBuy

# Linux/Mac
export SENDGRID_API_KEY=SG.your-actual-api-key-here
export FROM_EMAIL=noreply@yourdomain.com
export FROM_NAME=EasyBuy
```

### Bước 4: Cấu hình Domain (Tùy chọn)
1. Vào **Settings** > **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Thêm domain của bạn
4. Cập nhật DNS records
5. Verify domain

## 🧪 Test Email Service

### Test với API
```bash
# Test forgot password
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

### Test trực tiếp
```javascript
const EmailService = require('./services/email-service');
const emailService = new EmailService();

// Test gửi OTP
emailService.sendOTPEmail('your-email@example.com', '123456', 'Test User')
  .then(result => console.log('Email result:', result))
  .catch(error => console.error('Email error:', error));
```

## 📋 Troubleshooting

### Lỗi thường gặp:

1. **"Forbidden" Error**
   - Kiểm tra API Key có đúng không
   - Đảm bảo API Key có quyền Mail Send

2. **"Invalid API Key"**
   - Copy lại API Key từ SendGrid Dashboard
   - Đảm bảo không có khoảng trắng thừa

3. **"Sender not verified"**
   - Cần verify sender email trong SendGrid
   - Hoặc sử dụng domain đã verify

4. **Email không đến**
   - Kiểm tra spam folder
   - Đảm bảo email đích hợp lệ
   - Kiểm tra SendGrid Activity Feed

## 🔧 Cấu hình nâng cao

### Rate Limiting
```javascript
// Trong email-service.js
const rateLimit = {
  max: 10, // 10 emails per minute
  windowMs: 60 * 1000 // 1 minute
};
```

### Template Customization
```javascript
// Tùy chỉnh template trong generateOTPEmailTemplate()
const customTemplate = `
  <div style="background: your-brand-color;">
    <!-- Your custom HTML -->
  </div>
`;
```

### Logging
```javascript
// Thêm logging chi tiết
console.log(`📧 Email sent to ${toEmail} at ${new Date().toISOString()}`);
```

## 📊 Monitoring

### SendGrid Dashboard
- Vào **Activity** để xem email status
- Kiểm tra **Suppressions** nếu email bị block
- Monitor **Stats** để theo dõi performance

### Logs
```javascript
// Thêm vào complete-server.js
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
```

## 🚀 Production Tips

1. **Sử dụng domain riêng** cho FROM_EMAIL
2. **Setup SPF, DKIM, DMARC** records
3. **Monitor bounce rate** và spam complaints
4. **Implement retry logic** cho failed emails
5. **Use webhooks** để track email events

## 📞 Support

- SendGrid Documentation: https://docs.sendgrid.com/
- SendGrid Support: support@sendgrid.com
- Community Forum: https://community.sendgrid.com/
