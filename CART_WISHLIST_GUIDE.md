# 🛒 Hướng dẫn Cart & Wishlist mới

## ✨ Tính năng mới

### 🛒 **Cart Management (Giỏ hàng)**
- ✅ Lưu trữ trong database MySQL
- ✅ Xác thực JWT bắt buộc
- ✅ Thêm/sửa/xóa sản phẩm
- ✅ Cập nhật số lượng
- ✅ Tính toán tổng tiền tự động
- ✅ Xóa tất cả sản phẩm
- ✅ Đếm số lượng sản phẩm

### ❤️ **Wishlist Management (Danh sách yêu thích)**
- ✅ Lưu trữ trong database MySQL
- ✅ Xác thực JWT bắt buộc
- ✅ Thêm/xóa sản phẩm
- ✅ Kiểm tra trạng thái yêu thích
- ✅ Đếm số lượng sản phẩm
- ✅ Xóa tất cả sản phẩm

## 🚀 Cách sử dụng

### 1. Khởi động services
```bash
# Khởi động tất cả services
node start-services.js

# Hoặc khởi động từng service riêng lẻ
cd api-gateway && node server.js
cd services/user-service && node server.js
cd services/order-service && node server.js
```

### 2. Test hệ thống
```bash
# Chạy test đầy đủ
node test-new-cart-wishlist.js
```

### 3. Truy cập frontend
- **Trang chủ**: http://localhost:3000
- **Giỏ hàng**: http://localhost:3000/cart.html
- **Danh sách yêu thích**: http://localhost:3000/wishlist.html

## 📋 API Endpoints

### Cart APIs (Order Service - Port 3004)
```
GET    /cart              - Lấy danh sách giỏ hàng
POST   /cart/add          - Thêm sản phẩm vào giỏ hàng
PUT    /cart/update/:id   - Cập nhật số lượng
DELETE /cart/remove/:id   - Xóa sản phẩm khỏi giỏ hàng
DELETE /cart/clear        - Xóa tất cả sản phẩm
GET    /cart/count        - Đếm số lượng sản phẩm
```

### Wishlist APIs (User Service - Port 3002)
```
GET    /wishlist              - Lấy danh sách yêu thích
POST   /wishlist              - Thêm sản phẩm vào yêu thích
DELETE /wishlist/:productId   - Xóa sản phẩm khỏi yêu thích
GET    /wishlist/check/:id    - Kiểm tra trạng thái yêu thích
GET    /wishlist/count        - Đếm số lượng sản phẩm
DELETE /wishlist/clear        - Xóa tất cả sản phẩm
```

## 🔐 Xác thực

Tất cả API đều yêu cầu JWT token:
```javascript
headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
}
```

## 💾 Database Schema

### Cart Items Table
```sql
CREATE TABLE cart_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    variant_id INT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### Wishlist Table
```sql
CREATE TABLE wishlist (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE KEY unique_user_product (user_id, product_id)
);
```

## 🎯 Frontend Integration

### Cart Manager
```javascript
// Khởi tạo
const cart = new CartManager();

// Thêm vào giỏ hàng
await cart.addToCart(productId, quantity, variantId);

// Cập nhật số lượng
await cart.updateQuantity(itemId, newQuantity);

// Xóa sản phẩm
await cart.removeItem(itemId);

// Xóa tất cả
await cart.clearCart();
```

### Wishlist Manager
```javascript
// Khởi tạo
const wishlist = new WishlistManager();

// Thêm vào yêu thích
await wishlist.addToWishlist(productId);

// Xóa khỏi yêu thích
await wishlist.removeFromWishlist(productId);

// Kiểm tra trạng thái
const isInWishlist = await wishlist.checkWishlistStatus(productId);

// Xóa tất cả
await wishlist.clearWishlist();
```

## 🔧 Troubleshooting

### Lỗi thường gặp:

1. **"Access denied" - 401 Unauthorized**
   - Kiểm tra JWT token có hợp lệ không
   - Đảm bảo user đã đăng nhập

2. **"Product not found" - 404 Not Found**
   - Kiểm tra productId có tồn tại không
   - Đảm bảo sản phẩm đang active

3. **"Insufficient stock" - 400 Bad Request**
   - Kiểm tra số lượng tồn kho
   - Giảm số lượng yêu cầu

4. **Service không khởi động**
   - Kiểm tra port có bị chiếm không
   - Kiểm tra database connection
   - Xem log lỗi trong console

### Debug Commands:
```bash
# Kiểm tra port đang sử dụng
netstat -ano | findstr :3000
netstat -ano | findstr :3002
netstat -ano | findstr :3004

# Test API trực tiếp
curl -X GET http://localhost:3000/api/health
curl -X GET http://localhost:3002/health
curl -X GET http://localhost:3004/health
```

## 🎉 Kết luận

Hệ thống Cart & Wishlist mới đã được viết lại hoàn toàn với:
- ✅ Database persistence
- ✅ JWT authentication
- ✅ Error handling tốt hơn
- ✅ UI/UX cải thiện
- ✅ Code sạch và dễ maintain

**Lưu ý**: Đảm bảo tất cả services đang chạy trước khi test frontend!













