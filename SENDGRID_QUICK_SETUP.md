# 🚀 Hướng dẫn nhanh gửi email thật với SendGrid

## 📧 Bước 1: Tạo tài khoản SendGrid (MIỄN PHÍ)
1. Truy cập: https://sendgrid.com/
2. Click **"Start for free"**
3. Điền thông tin:
   - Email: dangkhoa29102k2@gmail.com
   - Password: (mật khẩu mạnh)
   - Company: EasyBuy
4. Verify email và phone number

## 🔑 Bước 2: Lấy API Key
1. Đăng nhập SendGrid Dashboard: https://app.sendgrid.com/
2. Vào **Settings** → **API Keys**
3. Click **"Create API Key"**
4. Chọn **"Restricted Access"**
5. Cấp quyền **Mail Send** → **Full Access**
6. **Copy API Key** (bắt đầu với `SG.`)

## ⚙️ Bước 3: Cấu hình trong project
1. Mở file `.env` trong thư mục project
2. Thay đổi dòng:
   ```
   SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
   ```
   Thành:
   ```
   SENDGRID_API_KEY=SG.abc123def456... (API key thật của bạn)
   ```

## 🧪 Bước 4: Test
```bash
# Restart server
node complete-server.js

# Test gửi email
node test-email-service.js
```

## 📧 Bước 5: Verify Email (Quan trọng!)
1. Vào **Settings** → **Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Điền thông tin:
   - From Name: EasyBuy
   - From Email: dangkhoa29102k2@gmail.com
   - Reply To: dangkhoa29102k2@gmail.com
4. Check email và click link verify

## ❌ Nếu vẫn lỗi:
1. Kiểm tra API key có đúng format `SG.` không
2. Đảm bảo API key có quyền **Mail Send**
3. Kiểm tra email FROM_EMAIL đã verify chưa
4. Thử tạo API key mới

## 🔗 Quick Links:
- SendGrid Dashboard: https://app.sendgrid.com/
- API Keys: https://app.sendgrid.com/settings/api_keys
- Sender Authentication: https://app.sendgrid.com/settings/sender_auth
