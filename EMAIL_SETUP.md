# Hướng dẫn cấu hình Email OTP

## Cấu hình Gmail để gửi OTP

### Bước 1: Tạo App Password cho Gmail

1. Đăng nhập vào tài khoản Gmail của bạn
2. Vào **Quản lý tài khoản Google** → **Bảo mật**
3. Bật **Xác thực 2 bước** nếu chưa bật
4. Trong phần **Mật khẩu ứng dụng**, tạo mật khẩu mới
5. Chọn **Ứng dụng**: Mail
6. Chọn **Thiết bị**: Windows Computer
7. Sao chép mật khẩu được tạo (16 ký tự)

### Bước 2: Cập nhật cấu hình trong server

Mở file `simple-server.js` và cập nhật phần cấu hình email:

```javascript
// Email configuration
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com', // Thay đổi email của bạn
    pass: 'your-app-password' // Thay đổi app password của bạn
  }
});
```

**Thay đổi:**
- `your-email@gmail.com` → Email Gmail của bạn
- `your-app-password` → Mật khẩu ứng dụng 16 ký tự vừa tạo

### Bước 3: Cập nhật thông tin gửi email

Trong hàm `sendOTPEmail`, cập nhật:

```javascript
await transporter.sendMail({
  from: 'TMDT Store <your-email@gmail.com>', // Thay đổi email của bạn
  to: email,
  subject: subject,
  html: html
});
```

## Cấu hình Email khác

### Outlook/Hotmail

```javascript
const transporter = nodemailer.createTransporter({
  service: 'hotmail',
  auth: {
    user: 'your-email@outlook.com',
    pass: 'your-password'
  }
});
```

### Yahoo Mail

```javascript
const transporter = nodemailer.createTransporter({
  service: 'yahoo',
  auth: {
    user: 'your-email@yahoo.com',
    pass: 'your-app-password'
  }
});
```

### SMTP tùy chỉnh

```javascript
const transporter = nodemailer.createTransporter({
  host: 'smtp.your-provider.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@domain.com',
    pass: 'your-password'
  }
});
```

## Kiểm tra hoạt động

1. Khởi động server: `node simple-server.js`
2. Truy cập: `http://localhost:3000/register.html`
3. Đăng ký tài khoản mới với email thật
4. Kiểm tra hộp thư email để nhận mã OTP

## Lưu ý bảo mật

- Không commit mật khẩu email vào Git
- Sử dụng biến môi trường cho thông tin nhạy cảm
- Cân nhắc sử dụng dịch vụ email chuyên nghiệp cho production

## Xử lý lỗi thường gặp

### Lỗi "Invalid login"
- Kiểm tra email và mật khẩu ứng dụng
- Đảm bảo đã bật xác thực 2 bước

### Lỗi "Connection timeout"
- Kiểm tra kết nối internet
- Thử thay đổi port SMTP (465, 587)

### Email không được gửi
- Kiểm tra spam folder
- Xác nhận cấu hình SMTP đúng
- Kiểm tra log server để xem lỗi chi tiết
