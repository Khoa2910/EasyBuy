# 🎯 Hướng dẫn truy cập Admin Dashboard

## ❌ **VẤN ĐỀ HIỆN TẠI:**
Bạn đang truy cập sai URL! 

**❌ SAI:** `http://localhost:3000/admin/products.html`  
**✅ ĐÚNG:** `http://localhost:3000/admin-dashboard.html`

## 🚀 **CÁCH KHỞI ĐỘNG ĐÚNG:**

### **Bước 1: Khởi động server**
```bash
# Cách 1: Sử dụng script đơn giản (khuyến nghị)
node start-server-simple.js

# Cách 2: Khởi động trực tiếp
node complete-server.js
```

### **Bước 2: Truy cập đúng URL**
```
🌐 Admin Dashboard: http://localhost:3000/admin-dashboard.html
```

## 🔧 **SỬA LỖI REDIS:**

Lỗi Redis connection có thể bỏ qua vì dashboard vẫn hoạt động được. Nếu muốn sửa:

### **Cách 1: Cài đặt Redis (khuyến nghị)**
```bash
# Windows (với Chocolatey)
choco install redis

# Hoặc tải Redis for Windows
# https://github.com/microsoftarchive/redis/releases
```

### **Cách 2: Bỏ qua Redis (tạm thời)**
Dashboard vẫn hoạt động bình thường mà không cần Redis.

## 📊 **DASHBOARD FEATURES:**

### **URLs chính:**
- **🏠 Trang chủ**: `http://localhost:3000`
- **📊 Dashboard**: `http://localhost:3000/admin-dashboard.html`
- **👥 Users**: `http://localhost:3000/admin-users.html`
- **🛍️ Products**: `http://localhost:3000/admin-products.html`
- **📦 Orders**: `http://localhost:3000/admin-orders.html`

### **API Endpoints:**
- **📈 Statistics**: `http://localhost:3000/api/admin/statistics`
- **📋 Orders**: `http://localhost:3000/api/admin/orders`
- **🛍️ Products**: `http://localhost:3000/api/admin/products`
- **👥 Users**: `http://localhost:3000/api/admin/users`

## 🔐 **ĐĂNG NHẬP ADMIN:**

### **Thông tin đăng nhập:**
```
Email: admin@tmdt.com
Password: admin123
```

### **Cách đăng nhập:**
1. Truy cập: `http://localhost:3000/login.html`
2. Đăng nhập với thông tin trên
3. Sau khi đăng nhập, truy cập: `http://localhost:3000/admin-dashboard.html`

## 🎯 **TÍNH NĂNG DASHBOARD:**

### **Statistics Cards:**
- 💰 **Tổng doanh thu** với animation
- 📦 **Tổng đơn hàng** với tăng trưởng
- 👥 **Người dùng** với thống kê
- 🛍️ **Sản phẩm** với số liệu kho

### **Charts:**
- 📈 **Revenue Chart**: Doanh thu theo tháng
- 🍩 **Order Status**: Phân bố trạng thái đơn hàng
- 📊 **Top Products**: Sản phẩm bán chạy

### **Recent Orders:**
- 📋 Danh sách đơn hàng mới nhất
- 🔍 Chi tiết đơn hàng
- ⚡ Cập nhật trạng thái real-time

## 🚨 **TROUBLESHOOTING:**

### **Lỗi thường gặp:**

1. **"Bạn không có quyền truy cập"**
   - ✅ Đăng nhập trước: `http://localhost:3000/login.html`
   - ✅ Đảm bảo role = 'admin'

2. **"Cannot GET /admin-dashboard.html"**
   - ✅ Kiểm tra server đang chạy: `http://localhost:3000/health`
   - ✅ Restart server: `Ctrl+C` rồi `node complete-server.js`

3. **"Redis connection error"**
   - ✅ Bỏ qua lỗi này, dashboard vẫn hoạt động
   - ✅ Hoặc cài đặt Redis

4. **Dashboard trống/không có dữ liệu**
   - ✅ Kiểm tra database có dữ liệu
   - ✅ Kiểm tra API: `http://localhost:3000/api/admin/statistics`

## 🎉 **KẾT QUẢ MONG ĐỢI:**

Sau khi truy cập đúng URL `http://localhost:3000/admin-dashboard.html`, bạn sẽ thấy:

✅ **Giao diện dashboard đẹp** với sidebar và header  
✅ **Statistics cards** hiển thị dữ liệu thật  
✅ **Charts tương tác** với Chart.js  
✅ **Recent orders table** với dữ liệu thật  
✅ **Responsive design** cho mọi thiết bị  
✅ **Real-time updates** với auto-refresh  

## 📞 **HỖ TRỢ:**

Nếu vẫn gặp vấn đề:
1. Kiểm tra console browser (F12)
2. Kiểm tra network tab
3. Restart server hoàn toàn
4. Clear browser cache

**Dashboard sẽ hoạt động hoàn hảo với dữ liệu thật từ database!** 🚀✨


