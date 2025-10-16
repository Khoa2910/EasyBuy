# 🔧 Hướng dẫn sửa lỗi trang Profile

## ✅ **Đã sửa các vấn đề**

### **1. Hiển thị thông tin cá nhân chính xác**
- ✅ Kết nối với API `/user/profile` để lấy dữ liệu thực
- ✅ Hiển thị thông tin từ database thay vì dữ liệu mock
- ✅ Cập nhật sidebar với thông tin người dùng

### **2. Chức năng chỉnh sửa thông tin**
- ✅ Form cập nhật profile kết nối với API `PUT /user/profile`
- ✅ Validation dữ liệu đầu vào
- ✅ Thông báo thành công/lỗi
- ✅ Reload dữ liệu sau khi cập nhật

### **3. Quản lý địa chỉ**
- ✅ Hiển thị danh sách địa chỉ từ API
- ✅ Thêm địa chỉ mới với modal form
- ✅ Chỉnh sửa địa chỉ hiện có
- ✅ Xóa địa chỉ
- ✅ Đặt địa chỉ mặc định

## 🚀 **Cách sử dụng**

### **1. Truy cập trang profile**
```
http://localhost:3000/profile.html
```

### **2. Đăng nhập trước**
- Phải đăng nhập để truy cập trang profile
- Token JWT được lưu trong localStorage

### **3. Các chức năng chính**

#### **Thông tin cá nhân:**
- Xem thông tin hiện tại
- Chỉnh sửa họ tên, số điện thoại, ngày sinh, giới tính
- Email không thể chỉnh sửa (readonly)

#### **Quản lý địa chỉ:**
- Xem danh sách địa chỉ
- Thêm địa chỉ mới (nhà riêng, công ty, khác)
- Chỉnh sửa địa chỉ hiện có
- Xóa địa chỉ
- Đặt địa chỉ mặc định

#### **Bảo mật:**
- Đổi mật khẩu (chưa implement API)

#### **Thông báo:**
- Cài đặt nhận thông báo (chưa implement API)

## 🔧 **API Endpoints sử dụng**

### **User Profile:**
```javascript
GET /api/user/profile          // Lấy thông tin profile
PUT /api/user/profile          // Cập nhật profile
```

### **User Addresses:**
```javascript
GET /api/user/addresses        // Lấy danh sách địa chỉ
POST /api/user/addresses       // Thêm địa chỉ mới
PUT /api/user/addresses/:id    // Cập nhật địa chỉ
DELETE /api/user/addresses/:id // Xóa địa chỉ
```

## 🧪 **Test API**

Chạy file test để kiểm tra API:
```bash
node test-profile-api.js
```

## 📱 **Giao diện**

### **Sidebar:**
- Avatar người dùng
- Tên và email
- Menu điều hướng

### **Tab Thông tin cá nhân:**
- Form chỉnh sửa thông tin
- Validation dữ liệu
- Nút cập nhật

### **Tab Địa chỉ:**
- Danh sách địa chỉ dạng card
- Nút thêm/chỉnh sửa/xóa
- Modal form cho thêm/sửa

### **Tab Bảo mật:**
- Form đổi mật khẩu
- Validation mật khẩu

### **Tab Thông báo:**
- Checkbox cài đặt thông báo
- Lưu cài đặt

## 🐛 **Xử lý lỗi**

### **Lỗi thường gặp:**

1. **"Không thể tải thông tin hồ sơ"**
   - Kiểm tra kết nối API
   - Kiểm tra token JWT
   - Kiểm tra User Service có chạy không

2. **"Có lỗi xảy ra khi cập nhật thông tin"**
   - Kiểm tra validation dữ liệu
   - Kiểm tra API endpoint
   - Kiểm tra quyền truy cập

3. **"Có lỗi xảy ra khi lưu địa chỉ"**
   - Kiểm tra dữ liệu đầu vào
   - Kiểm tra API endpoint
   - Kiểm tra validation

## 🔒 **Bảo mật**

- Tất cả API calls đều có JWT token
- Validation dữ liệu đầu vào
- Xử lý lỗi an toàn
- Không hiển thị thông tin nhạy cảm

## 📝 **Ghi chú**

- Trang profile chỉ hoạt động khi đã đăng nhập
- Dữ liệu được load từ API thực tế
- Form validation được thực hiện ở cả client và server
- Thông báo lỗi/thành công được hiển thị rõ ràng

