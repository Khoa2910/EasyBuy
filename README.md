# TMDT E-commerce Platform

Một nền tảng thương mại điện tử toàn diện được xây dựng với kiến trúc microservices, hỗ trợ bán các sản phẩm gia dụng với khả năng mở rộng cho 10.000 người dùng đồng thời.

## 🏗️ Kiến trúc hệ thống

### Frontend
- **HTML/CSS/Bootstrap**: Giao diện người dùng responsive
- **JavaScript**: Xử lý tương tác động và API calls
- **CDN**: AWS CloudFront cho tài nguyên tĩnh

### Backend
- **API Gateway**: Node.js + Express.js làm cổng API trung tâm
- **Microservices**: 9 dịch vụ độc lập được container hóa
- **Database**: MySQL cho dữ liệu có cấu trúc
- **Cache**: Redis cho session management và caching
- **Storage**: AWS S3 cho hình ảnh và file

### Microservices

1. **Auth Service** (Port 3001)
   - Xác thực JWT + Bcrypt
   - Đăng ký/đăng nhập
   - Quản lý refresh token
   - Xác thực email

2. **User Service** (Port 3002)
   - Quản lý hồ sơ người dùng
   - Địa chỉ giao hàng
   - Danh sách yêu thích

3. **Product Service** (Port 3003)
   - CRUD sản phẩm và danh mục
   - Upload hình ảnh lên S3
   - Tìm kiếm và lọc sản phẩm

4. **Payment Service** (Port 3004)
   - Tích hợp Stripe
   - Xử lý thanh toán
   - Webhook handling

5. **Order Service** (Port 3008)
   - Quản lý giỏ hàng
   - Xử lý đơn hàng
   - Áp dụng mã giảm giá

6. **Admin Service** (Port 3005)
   - Bảng điều khiển quản trị
   - Quản lý sản phẩm/đơn hàng
   - Thống kê và báo cáo

7. **Search Service** (Port 3006)
   - Tìm kiếm full-text
   - Gợi ý sản phẩm
   - Lọc nâng cao

8. **Chat Service** (Port 3007)
   - WebSocket real-time
   - Hỗ trợ khách hàng
   - Lưu trữ tin nhắn

9. **Notification Service** (Port 3009)
   - Email (SendGrid)
   - SMS (Twilio)
   - Push notifications

## 🚀 Cài đặt và chạy

### Yêu cầu hệ thống
- Docker & Docker Compose
- Node.js 18+
- MySQL 8.0+
- Redis 7+

### 1. Clone repository
```bash
git clone <repository-url>
cd TMDT
```

### 2. Cấu hình môi trường
```bash
cp env.example .env
# Chỉnh sửa các biến môi trường trong .env
```

### 3. Chạy với Docker Compose
```bash
# Build và khởi động tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng services
docker-compose down
```

### 4. Chạy development mode
```bash
# Cài đặt dependencies
npm install

# Chạy tất cả services
npm run dev

# Hoặc chạy từng service riêng lẻ
npm run dev:gateway
npm run dev:auth
# ...
```

## 📊 Monitoring và Logging

### Prometheus
- URL: http://localhost:9090
- Thu thập metrics từ tất cả services
- Alerting rules cho high error rate, memory usage

### Grafana
- URL: http://localhost:3001
- Username: admin
- Password: admin
- Dashboard: TMDT E-commerce Platform

### Logging
- Winston logger cho tất cả services
- Log files: `logs/error.log`, `logs/combined.log`
- Structured JSON logging

## 🔧 Cấu hình

### Database
```sql
-- Tạo database
CREATE DATABASE tmdt_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Import schema
mysql -u root -p tmdt_ecommerce < database/init.sql
```

### Redis
```bash
# Cấu hình Redis
redis-server --port 6379
```

### AWS Services
1. **S3 Bucket**: Tạo bucket cho lưu trữ hình ảnh
2. **CloudFront**: Cấu hình CDN
3. **IAM User**: Tạo user với quyền S3 và CloudFront

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Load Testing
```bash
# Sử dụng Artillery
npm run test:load

# Hoặc JMeter
jmeter -n -t load-tests/ecommerce-load-test.jmx
```

### API Testing
```bash
# Health check
curl http://localhost:3000/health

# Test authentication
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'
```

## 📈 Performance Optimization

### Database
- Indexes trên các cột thường xuyên query
- Connection pooling
- Query optimization

### Caching
- Redis cho session storage
- API response caching
- Product data caching

### CDN
- CloudFront cho static assets
- Image optimization với Sharp
- Gzip compression

## 🔒 Security

### Authentication
- JWT tokens với expiration
- Refresh token rotation
- Password hashing với bcrypt

### API Security
- Rate limiting
- CORS configuration
- Input validation với Joi
- Helmet.js cho security headers

### Data Protection
- SQL injection prevention
- XSS protection
- CSRF tokens

## 📱 Frontend Features

### Responsive Design
- Mobile-first approach
- Bootstrap 5 components
- Custom CSS với CSS variables

### User Experience
- Real-time cart updates
- Wishlist functionality
- Product search và filtering
- Pagination

### Performance
- Lazy loading images
- Minified CSS/JS
- CDN integration

## 🚀 Deployment

### Production Environment
1. **AWS EC2**: Hosting cho services
2. **RDS**: Managed MySQL database
3. **ElastiCache**: Managed Redis
4. **S3 + CloudFront**: Static assets
5. **Load Balancer**: AWS ALB

### CI/CD Pipeline
```yaml
# GitHub Actions example
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to AWS
        run: |
          docker-compose -f docker-compose.prod.yml up -d
```

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/auth/register     - Đăng ký tài khoản
POST /api/auth/login        - Đăng nhập
POST /api/auth/refresh      - Refresh token
POST /api/auth/logout       - Đăng xuất
```

### Product Endpoints
```
GET  /api/products          - Danh sách sản phẩm
GET  /api/products/:id      - Chi tiết sản phẩm
GET  /api/categories        - Danh mục sản phẩm
GET  /api/brands           - Thương hiệu
```

### Order Endpoints
```
GET  /api/cart             - Giỏ hàng
POST /api/cart/add         - Thêm vào giỏ
PUT  /api/cart/update/:id  - Cập nhật số lượng
DELETE /api/cart/remove/:id - Xóa khỏi giỏ
POST /api/orders           - Tạo đơn hàng
```

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

- Email: support@tmdt.com
- Phone: 1900 1234
- Documentation: [docs.tmdt.com](https://docs.tmdt.com)

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] AI-powered recommendations
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Social login integration
- [ ] Inventory management
- [ ] Multi-vendor support

---

**EasyBuy** - Nơi mua sắm đồ gia dụng tin cậy! 🏠✨

