# Demo tính năng OTP

## Cách test tính năng OTP

### 1. Cấu hình Email (Bắt buộc)

Trước khi test, bạn cần cấu hình email trong file `simple-server.js`:

```javascript
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com', // Thay đổi email của bạn
    pass: 'your-app-password' // Thay đổi app password của bạn
  }
});
```

Xem hướng dẫn chi tiết trong file `EMAIL_SETUP.md`

### 2. Khởi động server

```bash
cd C:\xampp\htdocs\TMDT
node simple-server.js
```

### 3. Test đăng ký với OTP (Bắt buộc)

1. Truy cập: `http://localhost:3000/register.html`
2. Điền thông tin đăng ký với email thật
3. Nhấn "Đăng ký"
4. Hệ thống sẽ chuyển đến trang xác thực OTP
5. Kiểm tra email để lấy mã OTP 6 chữ số
6. Nhập mã OTP và xác thực để hoàn tất đăng ký

### 4. Test đăng nhập với OTP (Bắt buộc)

1. Truy cập: `http://localhost:3000/login.html`
2. Nhập email: `admin@tmdt.com`
3. Nhập mật khẩu: `admin123`
4. Nhấn "Đăng nhập"
5. Hệ thống sẽ xác thực mật khẩu và gửi OTP
6. Chuyển đến trang xác thực OTP
7. Kiểm tra email để lấy mã OTP
8. Nhập mã OTP để hoàn tất đăng nhập

## Tính năng OTP

### ✅ Đã hoàn thành

- [x] **Đăng ký bắt buộc OTP**: Nhập thông tin → Gửi OTP → Xác thực OTP → Hoàn tất đăng ký
- [x] **Đăng nhập bắt buộc OTP**: Nhập email + mật khẩu → Xác thực mật khẩu → Gửi OTP → Xác thực OTP → Hoàn tất đăng nhập
- [x] Gửi OTP qua email cho cả đăng ký và đăng nhập
- [x] Xác thực OTP 6 chữ số
- [x] Đếm ngược thời gian hết hạn (5 phút)
- [x] Gửi lại OTP
- [x] Giao diện thân thiện với người dùng
- [x] Lưu trữ OTP trong database
- [x] Bảo mật OTP (hết hạn, chỉ sử dụng 1 lần)
- [x] Lưu trữ tạm thời thông tin đăng nhập trong sessionStorage

### 🔧 Cấu hình cần thiết

- Cấu hình email SMTP trong `simple-server.js`
- Tạo bảng `otp_verifications` trong database
- Cài đặt package `nodemailer`

### 📱 Giao diện

- **Trang đăng ký**: Tích hợp nút gửi OTP
- **Trang đăng nhập**: 2 tùy chọn (mật khẩu + OTP)
- **Trang xác thực OTP**: Giao diện chuyên dụng với countdown

### 🛡️ Bảo mật

- OTP có thời hạn 5 phút
- Mỗi OTP chỉ sử dụng được 1 lần
- Kiểm tra email tồn tại trước khi gửi OTP
- Xóa OTP cũ khi tạo mới

## API Endpoints

### Gửi OTP đăng ký
```
POST /api/auth/send-otp-register
Body: { email, firstName, lastName, phone, password }
```

### Gửi OTP đăng nhập
```
POST /api/auth/send-otp-login
Body: { email }
```

### Xác thực OTP đăng ký
```
POST /api/auth/verify-otp-register
Body: { email, otp, firstName, lastName, password }
```

### Xác thực OTP đăng nhập
```
POST /api/auth/verify-otp-login
Body: { email, otp }
```

## Lưu ý

- Đảm bảo cấu hình email đúng để nhận được OTP
- Kiểm tra spam folder nếu không nhận được email
- OTP có hiệu lực trong 5 phút
- Có thể gửi lại OTP nếu cần
