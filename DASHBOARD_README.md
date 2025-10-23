# 📊 Admin Dashboard - EasyBuy E-commerce Platform

## 🎯 Tổng quan

Admin Dashboard là trang quản trị hoàn chỉnh cho hệ thống EasyBuy E-commerce với giao diện đẹp, dữ liệu thật và tính năng real-time.

## ✨ Tính năng chính

### 📈 **Dashboard Overview**
- **Thống kê tổng quan**: Doanh thu, đơn hàng, người dùng, sản phẩm
- **Biểu đồ tương tác**: Doanh thu theo tháng, trạng thái đơn hàng
- **Đơn hàng gần đây**: Danh sách đơn hàng mới nhất với trạng thái
- **Tăng trưởng**: Phần trăm tăng trưởng so với tháng trước
- **Auto-refresh**: Tự động cập nhật dữ liệu mỗi 5 phút

### 🎨 **Giao diện đẹp**
- **Responsive Design**: Tối ưu cho mọi thiết bị
- **Animations**: Hiệu ứng mượt mà với AOS và CSS animations
- **Dark Mode**: Hỗ trợ chế độ tối
- **Gradient Colors**: Màu sắc hiện đại với gradient
- **Loading States**: Trạng thái loading đẹp mắt

### 🔧 **Quản lý hệ thống**
- **Đơn hàng**: Xem, cập nhật trạng thái, chi tiết đơn hàng
- **Người dùng**: Quản lý tài khoản, phân quyền
- **Sản phẩm**: Quản lý catalog, kho hàng
- **Thống kê**: Báo cáo chi tiết, phân tích xu hướng

## 🚀 Cách sử dụng

### 1. Khởi động hệ thống

```bash
# Cách 1: Sử dụng script tự động
node start-dashboard.js

# Cách 2: Sử dụng Docker Compose
docker-compose up -d

# Cách 3: Khởi động từng service
cd api-gateway && node server.js &
cd services/admin-service && node server.js &
# ... các service khác
```

### 2. Truy cập Dashboard

```
URL: http://localhost:3000/admin-dashboard.html
```

### 3. Đăng nhập Admin

```
Email: admin@tmdt.com
Password: admin123
```

## 📁 Cấu trúc file

```
frontend/
├── admin-dashboard.html          # Trang dashboard chính
├── assets/
│   ├── css/
│   │   └── admin-dashboard.css   # CSS tùy chỉnh
│   └── js/
│       └── admin-dashboard.js     # JavaScript logic
services/
├── admin-service/
│   ├── server.js                 # API endpoints
│   ├── package.json              # Dependencies
│   └── Dockerfile               # Container config
test-dashboard.js                 # Script test
start-dashboard.js               # Script khởi động
```

## 🔌 API Endpoints

### Dashboard Statistics
```http
GET /api/admin/statistics
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "totalRevenue": 125000000,
  "totalOrders": 1247,
  "totalUsers": 2847,
  "totalProducts": 156,
  "revenueGrowth": 12.5,
  "ordersGrowth": 8.3,
  "usersGrowth": 15.2,
  "productsGrowth": 5.7
}
```

### Revenue Data
```http
GET /api/admin/revenue?period=monthly
Authorization: Bearer <admin-token>
```

### Recent Orders
```http
GET /api/admin/orders?limit=5
Authorization: Bearer <admin-token>
```

### Order Details
```http
GET /api/admin/orders/:id
Authorization: Bearer <admin-token>
```

### Update Order Status
```http
PUT /api/admin/orders/:id/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "delivering"
}
```

## 🎨 Giao diện

### Statistics Cards
- **Doanh thu**: Hiển thị tổng doanh thu với animation counter
- **Đơn hàng**: Số lượng đơn hàng với tăng trưởng
- **Người dùng**: Tổng số người dùng đăng ký
- **Sản phẩm**: Số lượng sản phẩm trong hệ thống

### Charts
- **Revenue Chart**: Biểu đồ doanh thu theo tháng (Line chart)
- **Order Status Chart**: Phân bố trạng thái đơn hàng (Doughnut chart)

### Recent Orders Table
- **Mã đơn**: ID đơn hàng
- **Khách hàng**: Tên khách hàng
- **Tổng tiền**: Số tiền với format VNĐ
- **Trạng thái**: Badge màu sắc theo trạng thái
- **Ngày tạo**: Thời gian tạo đơn hàng
- **Thao tác**: Nút xem chi tiết

## 🔧 Cấu hình

### Environment Variables
```bash
# Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=tmdt_user
MYSQL_PASSWORD=tmdt_password
MYSQL_DATABASE=easybuy

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret_key

# Services
ADMIN_SERVICE_URL=http://localhost:3005
API_GATEWAY_URL=http://localhost:3000
```

### Ports
- **API Gateway**: 3000
- **Admin Service**: 3005
- **MySQL**: 3306
- **Redis**: 6379

## 🧪 Testing

### Test Dashboard
```bash
node test-dashboard.js
```

### Manual Testing
1. Khởi động tất cả services
2. Truy cập `http://localhost:3000/admin-dashboard.html`
3. Kiểm tra các thống kê hiển thị
4. Test các chức năng tương tác

## 🎯 Tính năng nâng cao

### Real-time Updates
- Auto-refresh mỗi 5 phút
- WebSocket notifications (có thể mở rộng)
- Live order status updates

### Responsive Design
- Mobile-first approach
- Tablet optimization
- Desktop full-featured

### Accessibility
- Keyboard navigation
- Screen reader support
- High contrast mode
- Reduced motion support

### Performance
- Lazy loading
- Image optimization
- Caching strategies
- CDN integration

## 🔒 Bảo mật

### Authentication
- JWT token validation
- Admin role verification
- Session management

### Authorization
- Role-based access control
- API endpoint protection
- Data validation

### Security Headers
- CORS configuration
- Helmet.js protection
- Rate limiting

## 📊 Monitoring

### Health Checks
- Service status monitoring
- Database connectivity
- Redis connection
- API response times

### Logging
- Winston logger
- Error tracking
- Performance metrics
- User activity logs

## 🚀 Deployment

### Development
```bash
npm install
node start-dashboard.js
```

### Production
```bash
docker-compose up -d
```

### Staging
```bash
docker-compose -f docker-compose.staging.yml up -d
```

## 🐛 Troubleshooting

### Common Issues

1. **Services không khởi động**
   ```bash
   # Kiểm tra port
   netstat -ano | findstr :3000
   
   # Kiểm tra logs
   docker-compose logs
   ```

2. **Database connection failed**
   ```bash
   # Kiểm tra MySQL
   mysql -h localhost -u tmdt_user -p
   
   # Kiểm tra Redis
   redis-cli ping
   ```

3. **API không trả về dữ liệu**
   ```bash
   # Test API
   curl -H "Authorization: Bearer <token>" http://localhost:3000/api/admin/statistics
   ```

### Debug Commands
```bash
# Kiểm tra tất cả services
curl http://localhost:3000/health

# Test database
mysql -h localhost -u tmdt_user -ptmdt_password -e "SELECT COUNT(*) FROM orders"

# Test Redis
redis-cli ping
```

## 📈 Performance Optimization

### Frontend
- Minify CSS/JS
- Image optimization
- CDN integration
- Browser caching

### Backend
- Database indexing
- Query optimization
- Redis caching
- Connection pooling

### Infrastructure
- Load balancing
- Auto-scaling
- CDN distribution
- Database replication

## 🔄 Updates & Maintenance

### Regular Tasks
- Database backups
- Log rotation
- Security updates
- Performance monitoring

### Monitoring
- Health checks
- Error alerts
- Performance metrics
- User activity

## 📞 Support

- **Email**: admin@tmdt.com
- **Documentation**: [docs.tmdt.com/dashboard](https://docs.tmdt.com/dashboard)
- **Issues**: [GitHub Issues](https://github.com/tmdt/issues)

---

## 🎉 Kết luận

Admin Dashboard EasyBuy cung cấp:

✅ **Giao diện đẹp** với animations mượt mà  
✅ **Dữ liệu thật** từ database MySQL  
✅ **Real-time updates** với auto-refresh  
✅ **Responsive design** cho mọi thiết bị  
✅ **Security** với JWT authentication  
✅ **Performance** tối ưu với caching  
✅ **Scalability** với microservices architecture  

**EasyBuy Admin Dashboard** - Công cụ quản trị hoàn hảo cho hệ thống e-commerce! 🚀✨


