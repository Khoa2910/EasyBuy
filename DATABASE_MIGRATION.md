# 🔄 Hướng dẫn Migration Database từ TMDT sang EasyBuy

## ⚠️ QUAN TRỌNG: Backup dữ liệu trước khi migration

### Bước 1: Backup database cũ

```bash
# Backup database cũ
mysqldump -u root -p tmdt_ecommerce > tmdt_backup.sql
```

### Bước 2: Tạo database mới

```bash
# Tạo database mới
mysql -u root -p < scripts/create-easybuy-database.sql
```

### Bước 3: Import cấu trúc database mới

```bash
# Import cấu trúc và dữ liệu mẫu
mysql -u root -p easybuy < database/init.sql
```

### Bước 4: Migration dữ liệu (nếu có)

Nếu bạn có dữ liệu trong database cũ cần chuyển sang:

```bash
# Export từ database cũ
mysqldump -u root -p tmdt_ecommerce > tmdt_data_backup.sql

# Import vào database mới
mysql -u root -p easybuy < tmdt_data_backup.sql
```

### Bước 5: Cập nhật cấu hình

Tất cả các file đã được cập nhật:
- ✅ `simple-server.js` - Database connection
- ✅ `services/auth-service/server.js` - Auth service
- ✅ `services/product-service/server.js` - Product service  
- ✅ `services/order-service/server.js` - Order service
- ✅ `services/payment-service/server.js` - Payment service
- ✅ `docker-compose.yml` - Docker configuration
- ✅ `env.example` - Environment variables
- ✅ `database/init.sql` - Database schema

### Bước 6: Test database mới

```bash
# Khởi động server
node simple-server.js

# Kiểm tra kết nối
curl http://localhost:3000/health
```

## 🔍 Kiểm tra migration

### 1. Kiểm tra database tồn tại
```sql
SHOW DATABASES LIKE 'easybuy';
```

### 2. Kiểm tra bảng đã tạo
```sql
USE easybuy;
SHOW TABLES;
```

### 3. Kiểm tra dữ liệu
```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM products;
```

## 🗑️ Xóa database cũ (sau khi đã test xong)

```sql
-- CẢNH BÁO: Chỉ chạy sau khi đã test kỹ
DROP DATABASE tmdt_ecommerce;
```

## 📋 Checklist Migration

- [ ] Backup database cũ
- [ ] Tạo database mới
- [ ] Import cấu trúc database
- [ ] Migration dữ liệu (nếu cần)
- [ ] Test kết nối database
- [ ] Test các API endpoints
- [ ] Test đăng nhập/đăng ký
- [ ] Test Google OAuth
- [ ] Test gửi email OTP
- [ ] Xóa database cũ (nếu muốn)

## 🚨 Lưu ý quan trọng

1. **Backup trước khi migration** - Luôn backup dữ liệu quan trọng
2. **Test kỹ sau migration** - Đảm bảo tất cả tính năng hoạt động
3. **Cập nhật environment variables** - Nếu sử dụng .env file
4. **Cập nhật Docker** - Nếu sử dụng Docker containers
5. **Thông báo team** - Nếu có team members khác

## 🔧 Troubleshooting

### Lỗi "Database does not exist"
```sql
CREATE DATABASE easybuy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Lỗi "Table doesn't exist"
```bash
mysql -u root -p easybuy < database/init.sql
```

### Lỗi kết nối database
- Kiểm tra tên database trong các file config
- Kiểm tra MySQL service đang chạy
- Kiểm tra quyền truy cập database
