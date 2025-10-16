# Cấu trúc dự án TMDT E-commerce Platform

## 📁 Tổng quan cấu trúc

```
TMDT/
├── 📁 api-gateway/                 # API Gateway (Port 3000)
│   ├── 📄 server.js               # Main gateway server
│   ├── 📄 package.json            # Dependencies
│   └── 📄 Dockerfile              # Container config
│
├── 📁 services/                    # Microservices
│   ├── 📁 auth-service/           # Xác thực (Port 3001)
│   │   ├── 📄 server.js
│   │   ├── 📄 package.json
│   │   └── 📄 Dockerfile
│   │
│   ├── 📁 user-service/           # Quản lý người dùng (Port 3002)
│   │   ├── 📄 server.js
│   │   ├── 📄 package.json
│   │   └── 📄 Dockerfile
│   │
│   ├── 📁 product-service/        # Sản phẩm (Port 3003)
│   │   ├── 📄 server.js
│   │   ├── 📄 package.json
│   │   └── 📄 Dockerfile
│   │
│   ├── 📁 payment-service/        # Thanh toán (Port 3004)
│   │   ├── 📄 server.js
│   │   ├── 📄 package.json
│   │   └── 📄 Dockerfile
│   │
│   ├── 📁 admin-service/          # Quản trị (Port 3005)
│   │   ├── 📄 server.js
│   │   ├── 📄 package.json
│   │   └── 📄 Dockerfile
│   │
│   ├── 📁 search-service/         # Tìm kiếm (Port 3006)
│   │   ├── 📄 server.js
│   │   ├── 📄 package.json
│   │   └── 📄 Dockerfile
│   │
│   ├── 📁 chat-service/           # Chat real-time (Port 3007)
│   │   ├── 📄 server.js
│   │   ├── 📄 package.json
│   │   └── 📄 Dockerfile
│   │
│   ├── 📁 order-service/          # Đơn hàng (Port 3008)
│   │   ├── 📄 server.js
│   │   ├── 📄 package.json
│   │   └── 📄 Dockerfile
│   │
│   └── 📁 notification-service/   # Thông báo (Port 3009)
│       ├── 📄 server.js
│       ├── 📄 package.json
│       └── 📄 Dockerfile
│
├── 📁 frontend/                    # Giao diện người dùng
│   ├── 📄 index.html              # Trang chủ
│   ├── 📄 products.html           # Danh sách sản phẩm
│   ├── 📄 cart.html               # Giỏ hàng
│   ├── 📄 checkout.html           # Thanh toán
│   ├── 📄 profile.html            # Hồ sơ người dùng
│   ├── 📄 orders.html             # Đơn hàng
│   ├── 📄 wishlist.html           # Danh sách yêu thích
│   ├── 📄 admin.html              # Bảng điều khiển admin
│   │
│   └── 📁 assets/                 # Tài nguyên tĩnh
│       ├── 📁 css/
│       │   └── 📄 style.css       # CSS chính
│       └── 📁 js/
│           ├── 📄 app.js          # JavaScript chính
│           ├── 📄 auth.js         # Xác thực
│           ├── 📄 cart.js         # Giỏ hàng
│           ├── 📄 products.js     # Sản phẩm
│           └── 📄 admin.js        # Admin functions
│
├── 📁 database/                    # Cơ sở dữ liệu
│   └── 📄 init.sql                # Schema và dữ liệu mẫu
│
├── 📁 monitoring/                  # Giám sát
│   ├── 📄 prometheus.yml          # Cấu hình Prometheus
│   └── 📁 grafana-dashboards/
│       └── 📄 dashboard.json      # Dashboard Grafana
│
├── 📁 load-tests/                 # Kiểm tra tải
│   └── 📄 load-test.yml           # Artillery load test
│
├── 📁 scripts/                    # Scripts tiện ích
│   └── 📄 setup.sh                # Script cài đặt
│
├── 📁 docs/                       # Tài liệu
│   ├── 📄 API.md                  # API documentation
│   └── 📄 DEPLOYMENT.md           # Hướng dẫn deployment
│
├── 📄 package.json                # Dependencies chính
├── 📄 docker-compose.yml          # Docker Compose config
├── 📄 env.example                 # Mẫu biến môi trường
├── 📄 README.md                   # Tài liệu chính
├── 📄 LICENSE                     # Giấy phép MIT
└── 📄 .gitignore                  # Git ignore rules
```

## 🔧 Cấu hình Services

### Port Mapping
| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3000 | Cổng API chính |
| Auth Service | 3001 | Xác thực người dùng |
| User Service | 3002 | Quản lý hồ sơ |
| Product Service | 3003 | Quản lý sản phẩm |
| Payment Service | 3004 | Xử lý thanh toán |
| Admin Service | 3005 | Bảng điều khiển admin |
| Search Service | 3006 | Tìm kiếm sản phẩm |
| Chat Service | 3007 | Chat real-time |
| Order Service | 3008 | Quản lý đơn hàng |
| Notification Service | 3009 | Gửi thông báo |
| MySQL | 3306 | Cơ sở dữ liệu |
| Redis | 6379 | Cache và session |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3001 | Monitoring dashboard |

### Database Tables
| Table | Description |
|-------|-------------|
| `users` | Thông tin người dùng |
| `user_addresses` | Địa chỉ giao hàng |
| `categories` | Danh mục sản phẩm |
| `brands` | Thương hiệu |
| `products` | Sản phẩm |
| `product_images` | Hình ảnh sản phẩm |
| `product_variants` | Biến thể sản phẩm |
| `cart_items` | Giỏ hàng |
| `orders` | Đơn hàng |
| `order_items` | Chi tiết đơn hàng |
| `coupons` | Mã giảm giá |
| `product_reviews` | Đánh giá sản phẩm |
| `wishlist_items` | Danh sách yêu thích |
| `chat_conversations` | Cuộc trò chuyện |
| `chat_messages` | Tin nhắn |
| `notifications` | Thông báo |
| `settings` | Cài đặt hệ thống |

## 🚀 Cách chạy dự án

### 1. Development Mode
```bash
# Cài đặt dependencies
npm install

# Chạy tất cả services
npm run dev

# Hoặc chạy từng service
npm run dev:gateway
npm run dev:auth
# ...
```

### 2. Docker Mode
```bash
# Khởi động tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng services
docker-compose down
```

### 3. Production Mode
```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Monitoring & Logging

### Prometheus Metrics
- HTTP request rate và response time
- Database connection pool
- Memory và CPU usage
- Error rates
- Custom business metrics

### Grafana Dashboards
- Service health status
- Performance metrics
- Error tracking
- Database performance
- User activity

### Logging
- Winston logger cho tất cả services
- Structured JSON logs
- Error tracking và alerting
- Log rotation

## 🔒 Security Features

### Authentication
- JWT tokens với expiration
- Refresh token rotation
- Password hashing với bcrypt
- Email verification

### API Security
- Rate limiting
- CORS configuration
- Input validation
- SQL injection prevention
- XSS protection

### Data Protection
- HTTPS enforcement
- Secure headers
- Environment variables
- Database encryption

## 📱 Frontend Features

### Responsive Design
- Mobile-first approach
- Bootstrap 5 components
- Custom CSS với variables
- Progressive Web App ready

### User Experience
- Real-time updates
- Offline support
- Fast loading
- Intuitive navigation

### Performance
- Image optimization
- Code splitting
- CDN integration
- Caching strategies

## 🧪 Testing

### Unit Tests
- Jest framework
- Service-specific tests
- Mock external dependencies
- Coverage reporting

### Integration Tests
- API endpoint testing
- Database integration
- Service communication
- End-to-end scenarios

### Load Testing
- Artillery load tests
- JMeter scenarios
- Performance benchmarks
- Scalability testing

## 📈 Performance Optimization

### Database
- Indexes trên các cột quan trọng
- Query optimization
- Connection pooling
- Read replicas

### Caching
- Redis cho session storage
- API response caching
- CDN cho static assets
- Browser caching

### CDN
- CloudFront distribution
- Image optimization
- Gzip compression
- Edge locations

## 🚀 Deployment

### Development
- Docker Compose
- Local databases
- Hot reloading
- Debug tools

### Staging
- AWS EC2 instances
- RDS MySQL
- ElastiCache Redis
- Load balancer

### Production
- Auto-scaling groups
- Multi-AZ deployment
- SSL certificates
- Monitoring alerts

## 📚 Documentation

### API Documentation
- OpenAPI/Swagger specs
- Interactive testing
- Code examples
- Error handling

### Deployment Guides
- Step-by-step instructions
- Environment setup
- Security configuration
- Troubleshooting

### User Guides
- Admin documentation
- API integration
- Customization guides
- Best practices

## 🔧 Maintenance

### Regular Tasks
- Database backups
- Log rotation
- Security updates
- Performance monitoring

### Monitoring
- Health checks
- Alert systems
- Performance metrics
- Error tracking

### Scaling
- Horizontal scaling
- Load balancing
- Database sharding
- Microservice scaling

---

## 📞 Support

- **Email**: support@tmdt.com
- **Documentation**: https://docs.tmdt.com
- **GitHub Issues**: https://github.com/tmdt/issues
- **Slack**: #tmdt-support

**TMDT Store** - Nền tảng thương mại điện tử hiện đại! 🏪✨

