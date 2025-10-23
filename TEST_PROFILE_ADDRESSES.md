# Hướng dẫn test trang Profile với địa chỉ

## Bước 1: Restart server
```bash
# Dừng server hiện tại (Ctrl+C nếu đang chạy)
# Sau đó chạy lại:
node complete-server.js
```

## Bước 2: Đăng nhập
1. Mở trình duyệt: `http://localhost:3000/login.html`
2. Đăng nhập với tài khoản test:
   - **Email**: test@example.com
   - **Password**: 123456

## Bước 3: Truy cập trang Profile
1. Sau khi đăng nhập, vào: `http://localhost:3000/profile.html`
2. Click vào tab **"Địa chỉ"**

## Kết quả mong đợi:
Bạn sẽ thấy 2 địa chỉ:

1. **Test User** (Mặc định)
   - Phone: 0123456789
   - Address: 123 Test Street, Apartment 1A
   - City: Hanoi, Hanoi 100000

2. **Test User Office**
   - Phone: 0987654321
   - Address: 456 Office Building, Floor 5
   - City: Ho Chi Minh City, Ho Chi Minh City 700000

## Nếu vẫn thấy "undefined":
Hãy kiểm tra:
1. Console của browser (F12) để xem lỗi gì
2. Đảm bảo server đã được restart
3. Hard refresh trang (Ctrl + F5)

## Tài khoản khác để test:
Bạn cũng có thể đăng nhập với tài khoản hiện tại của bạn:
- **Email**: dangkhoa29102k2@gmail.com
- Đã có 3 địa chỉ mẫu trong database
