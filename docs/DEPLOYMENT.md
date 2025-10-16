# Hướng dẫn Deployment - TMDT E-commerce Platform

## 🚀 Production Deployment

### 1. Chuẩn bị môi trường Production

#### AWS Infrastructure
```bash
# Tạo VPC và subnets
aws ec2 create-vpc --cidr-block 10.0.0.0/16
aws ec2 create-subnet --vpc-id vpc-xxxxx --cidr-block 10.0.1.0/24

# Tạo Security Groups
aws ec2 create-security-group --group-name tmdt-web-sg --description "TMDT Web Security Group"
aws ec2 create-security-group --group-name tmdt-db-sg --description "TMDT Database Security Group"
```

#### RDS MySQL Setup
```bash
# Tạo RDS instance
aws rds create-db-instance \
  --db-instance-identifier tmdt-mysql \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --master-username admin \
  --master-user-password YourPassword123 \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxx
```

#### ElastiCache Redis Setup
```bash
# Tạo Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id tmdt-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

### 2. Docker Production Configuration

#### docker-compose.prod.yml
```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - api-gateway

  api-gateway:
    build: ./api-gateway
    environment:
      - NODE_ENV=production
      - MYSQL_HOST=${RDS_ENDPOINT}
      - REDIS_HOST=${REDIS_ENDPOINT}
      - JWT_SECRET=${JWT_SECRET}
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  # ... other services with similar configuration
```

#### nginx/nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    upstream api_gateway {
        server api-gateway:3000;
    }

    server {
        listen 80;
        server_name yourdomain.com;

        location / {
            proxy_pass http://api_gateway;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location /static/ {
            alias /var/www/static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 3. Environment Variables

#### .env.production
```bash
# Database
MYSQL_HOST=your-rds-endpoint.amazonaws.com
MYSQL_PORT=3306
MYSQL_USER=admin
MYSQL_PASSWORD=YourPassword123
MYSQL_DATABASE=tmdt_ecommerce

# Redis
REDIS_HOST=your-redis-endpoint.cache.amazonaws.com
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-for-production
JWT_EXPIRES_IN=24h

# Stripe
STRIPE_SECRET_KEY=sk_live_your_live_stripe_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# AWS
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-production-bucket
CLOUDFRONT_DOMAIN=your-cloudfront-domain

# Email
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com

# SMS
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Application
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
```

### 4. Database Migration

#### Production Database Setup
```sql
-- Tạo database
CREATE DATABASE tmdt_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Import schema
mysql -h your-rds-endpoint.amazonaws.com -u admin -p tmdt_ecommerce < database/init.sql

-- Tạo indexes cho performance
CREATE INDEX idx_products_search ON products(name, description, tags);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_cart_user_product ON cart_items(user_id, product_id);
```

### 5. SSL Certificate

#### Let's Encrypt với Certbot
```bash
# Cài đặt Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Tạo certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Thêm dòng: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 6. Monitoring Setup

#### Prometheus Production Config
```yaml
# monitoring/prometheus.prod.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'tmdt-services'
    static_configs:
      - targets: ['api-gateway:3000', 'auth-service:3001', ...]
    scrape_interval: 10s
    metrics_path: '/metrics'
```

#### Grafana Dashboard Import
```bash
# Import dashboard
curl -X POST \
  -H "Content-Type: application/json" \
  -d @monitoring/grafana-dashboards/dashboard.json \
  http://admin:admin@localhost:3001/api/dashboards/db
```

### 7. Load Testing

#### Artillery Load Test
```yaml
# load-tests/load-test.yml
config:
  target: 'https://yourdomain.com'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100

scenarios:
  - name: "E-commerce Load Test"
    weight: 100
    flow:
      - get:
          url: "/api/products"
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
      - get:
          url: "/api/cart"
```

#### JMeter Load Test
```bash
# Chạy JMeter test
jmeter -n -t load-tests/ecommerce-load-test.jmx -l results.jtl
```

### 8. Backup Strategy

#### Database Backup
```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h your-rds-endpoint.amazonaws.com -u admin -p tmdt_ecommerce > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/database/
```

#### Automated Backup với Cron
```bash
# Crontab entry
0 2 * * * /path/to/backup-db.sh
```

### 9. CI/CD Pipeline

#### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Build and push Docker images
        run: |
          docker build -t tmdt/api-gateway ./api-gateway
          docker tag tmdt/api-gateway:latest $ECR_REGISTRY/tmdt/api-gateway:latest
          docker push $ECR_REGISTRY/tmdt/api-gateway:latest
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster tmdt-cluster --service tmdt-service --force-new-deployment
```

### 10. Health Checks

#### Application Health Check
```bash
#!/bin/bash
# health-check.sh
curl -f http://localhost:3000/health || exit 1
curl -f http://localhost:3001/health || exit 1
# ... check all services
```

#### AWS Application Load Balancer Health Check
```bash
# ALB Target Group Health Check
Health Check Path: /health
Health Check Port: 3000
Health Check Protocol: HTTP
Healthy Threshold: 2
Unhealthy Threshold: 3
Timeout: 5 seconds
Interval: 30 seconds
```

### 11. Scaling Configuration

#### Auto Scaling Group
```bash
# Tạo Launch Template
aws ec2 create-launch-template \
  --launch-template-name tmdt-template \
  --launch-template-data file://launch-template.json

# Tạo Auto Scaling Group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name tmdt-asg \
  --launch-template LaunchTemplateName=tmdt-template \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 3
```

#### ECS Service Scaling
```json
{
  "serviceName": "tmdt-service",
  "cluster": "tmdt-cluster",
  "desiredCount": 3,
  "deploymentConfiguration": {
    "maximumPercent": 200,
    "minimumHealthyPercent": 50
  },
  "autoScalingConfiguration": {
    "targetTrackingScalingPolicies": [
      {
        "targetValue": 70.0,
        "scaleOutCooldown": 300,
        "scaleInCooldown": 300,
        "metricType": "ECSServiceAverageCPUUtilization"
      }
    ]
  }
}
```

### 12. Security Hardening

#### Security Headers
```javascript
// middleware/security.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https://your-s3-bucket.s3.amazonaws.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

#### Rate Limiting
```javascript
// middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);
```

### 13. Performance Optimization

#### CDN Configuration
```javascript
// CloudFront distribution settings
{
  "Origins": {
    "DomainName": "your-s3-bucket.s3.amazonaws.com",
    "OriginPath": "/static"
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-tmdt-static",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "TTL": {
      "DefaultTTL": 86400,
      "MaxTTL": 31536000
    }
  }
}
```

#### Database Optimization
```sql
-- Query optimization
EXPLAIN SELECT * FROM products WHERE category_id = 1 AND is_active = TRUE;

-- Add missing indexes
CREATE INDEX idx_products_category_active ON products(category_id, is_active);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_users_email ON users(email);
```

### 14. Troubleshooting

#### Common Issues
1. **High Memory Usage**
   ```bash
   # Check memory usage
   docker stats
   
   # Restart services
   docker-compose restart
   ```

2. **Database Connection Issues**
   ```bash
   # Check database connectivity
   mysql -h your-rds-endpoint.amazonaws.com -u admin -p -e "SELECT 1"
   ```

3. **Redis Connection Issues**
   ```bash
   # Test Redis connection
   redis-cli -h your-redis-endpoint.cache.amazonaws.com ping
   ```

#### Log Analysis
```bash
# View application logs
docker-compose logs -f api-gateway

# View error logs
tail -f logs/error.log

# Monitor system resources
htop
iostat -x 1
```

### 15. Maintenance

#### Regular Maintenance Tasks
- Database backup verification
- Log rotation
- Security updates
- Performance monitoring
- SSL certificate renewal

#### Monitoring Alerts
- High CPU usage (>80%)
- High memory usage (>90%)
- Database connection errors
- API response time >2s
- Error rate >5%

---

## 📞 Support

Nếu gặp vấn đề trong quá trình deployment, vui lòng liên hệ:
- Email: devops@tmdt.com
- Slack: #deployment-support
- Documentation: [docs.tmdt.com/deployment](https://docs.tmdt.com/deployment)

