# 🔧 Hướng dẫn cấu hình Google OAuth

## ⚠️ QUAN TRỌNG: Cần tạo Google OAuth credentials

### Bước 1: Tạo Google Cloud Project

1. **Truy cập Google Cloud Console:**
   - Đi đến: https://console.cloud.google.com/
   - Đăng nhập bằng tài khoản Google của bạn

2. **Tạo project mới:**
   - Nhấn "Select a project" → "New Project"
   - Tên project: "EasyBuy OAuth"
   - Nhấn "Create"

### Bước 2: Kích hoạt Google+ API

1. **Vào APIs & Services:**
   - Menu → APIs & Services → Library
   - Tìm "Google+ API" hoặc "Google Identity"
   - Nhấn "Enable"

### Bước 3: Tạo OAuth 2.0 Credentials

1. **Vào Credentials:**
   - APIs & Services → Credentials
   - Nhấn "Create Credentials" → "OAuth 2.0 Client IDs"

2. **Cấu hình OAuth consent screen:**
   - Nếu chưa có, tạo OAuth consent screen
   - User Type: External
   - App name: "EasyBuy"
   - User support email: email của bạn
   - Developer contact: email của bạn

3. **Tạo OAuth Client:**
   - Application type: "Web application"
   - Name: "EasyBuy Web Client"
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback`
   - Nhấn "Create"

4. **Sao chép thông tin:**
   - **Client ID**: Sao chép và lưu lại
   - **Client Secret**: Sao chép và lưu lại

### Bước 4: Cập nhật file simple-server.js

Mở file `simple-server.js` và thay đổi:

```javascript
// Google OAuth Configuration
const GOOGLE_CLIENT_ID = 'your-google-client-id'; // Thay đổi Client ID của bạn
const GOOGLE_CLIENT_SECRET = 'your-google-client-secret'; // Thay đổi Client Secret của bạn
```

**Thay đổi:**
- `your-google-client-id` → Client ID từ Google Cloud Console
- `your-google-client-secret` → Client Secret từ Google Cloud Console

### Bước 5: Cập nhật database

Chạy script để thêm cột google_id:

```sql
ALTER TABLE users ADD COLUMN google_id VARCHAR(100) UNIQUE;
CREATE INDEX idx_google_id ON users(google_id);
```

### Bước 6: Khởi động server

```bash
node simple-server.js
```

### Bước 7: Test Google OAuth

1. **Truy cập:** `http://localhost:3000/login.html`
2. **Nhấn:** "Đăng nhập bằng Google"
3. **Chọn tài khoản Google** và cấp quyền
4. **Kiểm tra:** Đăng nhập thành công và chuyển về trang chủ

## 🔍 Xử lý lỗi thường gặp

### Lỗi "redirect_uri_mismatch"
- Kiểm tra Authorized redirect URIs trong Google Console
- Đảm bảo URL chính xác: `http://localhost:3000/auth/google/callback`

### Lỗi "invalid_client"
- Kiểm tra Client ID và Client Secret
- Đảm bảo đã enable Google+ API

### Lỗi "access_denied"
- Kiểm tra OAuth consent screen
- Đảm bảo app đã được verify (hoặc thêm test users)

## 🚀 Production Setup

Khi deploy lên production:

1. **Cập nhật redirect URI:**
   - Thêm domain production: `https://yourdomain.com/auth/google/callback`

2. **Cập nhật environment variables:**
   ```javascript
   const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
   const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
   ```

3. **Cập nhật session config:**
   ```javascript
   cookie: { secure: true } // Chỉ với HTTPS
   ```

## 📱 Tính năng Google OAuth

### ✅ Đã hoàn thành

- [x] Đăng nhập bằng Google
- [x] Đăng ký bằng Google (tự động tạo tài khoản)
- [x] Lưu thông tin người dùng từ Google
- [x] Avatar từ Google Profile
- [x] Email verification tự động
- [x] Session management
- [x] Logout functionality

### 🔧 Cấu hình cần thiết

- Google Cloud Project
- OAuth 2.0 Credentials
- Database schema update
- Server configuration

## 🛡️ Bảo mật

- Không commit Client Secret vào Git
- Sử dụng environment variables
- Cấu hình HTTPS cho production
- Kiểm tra domain trong redirect URIs
