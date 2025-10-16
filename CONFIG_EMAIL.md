# 🔧 Hướng dẫn cấu hình Email OTP

## ⚠️ QUAN TRỌNG: Cần thay đổi thông tin email

### Bước 1: Tạo App Password cho Gmail

1. **Đăng nhập Gmail** của bạn
2. Vào **Quản lý tài khoản Google** → **Bảo mật**
3. **Bật xác thực 2 bước** nếu chưa bật
4. Trong phần **Mật khẩu ứng dụng**, tạo mật khẩu mới:
   - Chọn **Ứng dụng**: Mail
   - Chọn **Thiết bị**: Windows Computer
   - **Sao chép mật khẩu 16 ký tự** được tạo

### Bước 2: Cập nhật file simple-server.js

Mở file `simple-server.js` và thay đổi 2 chỗ:

#### Chỗ 1: Cấu hình transporter (dòng 33-39)
```javascript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com', // ⚠️ THAY ĐỔI: Email Gmail của bạn
    pass: 'your-app-password' // ⚠️ THAY ĐỔI: App password 16 ký tự
  }
});
```

#### Chỗ 2: Thông tin gửi email (dòng 86)
```javascript
from: 'EasyBuy <your-email@gmail.com>', // ⚠️ THAY ĐỔI: Email của bạn
```

### Bước 3: Khởi động lại server

```bash
node simple-server.js
```

### Bước 4: Test gửi email

1. Truy cập: `http://localhost:3000/login.html`
2. Nhập email: `admin@tmdt.com`
3. Nhập mật khẩu: `admin123`
4. Nhấn "Đăng nhập"
5. Kiểm tra hộp thư email để nhận mã OTP

## 🔍 Kiểm tra lỗi

Nếu có lỗi, kiểm tra console server:
- ✅ `OTP sent to email@example.com: 123456` = Thành công
- ❌ `Error sending OTP email: ...` = Có lỗi

## 📧 Cấu hình email khác

### Outlook/Hotmail
```javascript
const transporter = nodemailer.createTransport({
  service: 'hotmail',
  auth: {
    user: 'your-email@outlook.com',
    pass: 'your-password'
  }
});
```

### Yahoo Mail
```javascript
const transporter = nodemailer.createTransport({
  service: 'yahoo',
  auth: {
    user: 'your-email@yahoo.com',
    pass: 'your-app-password'
  }
});
```

## 🛡️ Bảo mật

- Không commit mật khẩu email vào Git
- Sử dụng biến môi trường cho production
- Không chia sẻ app password với ai khác
