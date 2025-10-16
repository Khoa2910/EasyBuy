# TMDT E-commerce API Documentation

## Base URL
```
Development: http://localhost:3000/api
Production: https://yourdomain.com/api
```

## Authentication

Tất cả các API endpoints (trừ public endpoints) yêu cầu xác thực bằng JWT token trong header:

```
Authorization: Bearer <your-jwt-token>
```

## Public Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "0123456789"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "abc123def456..."
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "abc123def456..."
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "abc123def456..."
}
```

#### Logout
```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "abc123def456..."
}
```

### Products

#### Get Products
```http
GET /products?page=1&limit=20&category=1&brand=1&minPrice=100000&maxPrice=1000000&sort=price_asc&search=kitchen
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `category` (optional): Category ID filter
- `brand` (optional): Brand ID filter
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `sort` (optional): Sort order (`price_asc`, `price_desc`, `name_asc`, `name_desc`, `created_desc`, `rating_desc`)
- `search` (optional): Search term

**Response:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Bộ dao nhà bếp cao cấp",
      "slug": "bo-dao-nha-bep-cao-cap",
      "description": "Bộ dao nhà bếp 6 món với thép không gỉ cao cấp",
      "price": 450000,
      "sale_price": 400000,
      "is_on_sale": true,
      "rating_average": 4.5,
      "rating_count": 120,
      "primary_image": "https://example.com/image.jpg",
      "category_name": "Đồ dùng nhà bếp",
      "brand_name": "KitchenMaster"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### Get Single Product
```http
GET /products/1
```

**Response:**
```json
{
  "id": 1,
  "name": "Bộ dao nhà bếp cao cấp",
  "slug": "bo-dao-nha-bep-cao-cap",
  "description": "Bộ dao nhà bếp 6 món với thép không gỉ cao cấp",
  "price": 450000,
  "sale_price": 400000,
  "is_on_sale": true,
  "rating_average": 4.5,
  "rating_count": 120,
  "images": [
    {
      "image_url": "https://example.com/image1.jpg",
      "alt_text": "Main product image",
      "is_primary": true
    }
  ],
  "variants": [
    {
      "id": 1,
      "name": "Large",
      "price": 500000,
      "stock_quantity": 10
    }
  ],
  "related_products": [...]
}
```

#### Get Categories
```http
GET /categories
```

#### Get Brands
```http
GET /brands
```

## Protected Endpoints

### User Profile

#### Get Profile
```http
GET /user/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "0123456789",
  "dateOfBirth": "1990-01-01",
  "gender": "male"
}
```

#### Add Address
```http
POST /user/addresses
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "home",
  "recipientName": "John Doe",
  "phone": "0123456789",
  "addressLine1": "123 Main Street",
  "addressLine2": "Apt 4B",
  "city": "Hanoi",
  "state": "Hanoi",
  "postalCode": "100000",
  "country": "Vietnam",
  "isDefault": true
}
```

### Shopping Cart

#### Get Cart
```http
GET /cart
Authorization: Bearer <token>
```

#### Add to Cart
```http
POST /cart/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": 1,
  "quantity": 2,
  "variantId": 1
}
```

#### Update Cart Item
```http
PUT /cart/update/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 3
}
```

#### Remove from Cart
```http
DELETE /cart/remove/1
Authorization: Bearer <token>
```

#### Clear Cart
```http
DELETE /cart/clear
Authorization: Bearer <token>
```

### Orders

#### Create Order
```http
POST /orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "shippingAddress": {
    "recipientName": "John Doe",
    "phone": "0123456789",
    "addressLine1": "123 Main Street",
    "city": "Hanoi",
    "state": "Hanoi",
    "postalCode": "100000",
    "country": "Vietnam"
  },
  "billingAddress": {
    "recipientName": "John Doe",
    "phone": "0123456789",
    "addressLine1": "123 Main Street",
    "city": "Hanoi",
    "state": "Hanoi",
    "postalCode": "100000",
    "country": "Vietnam"
  },
  "paymentMethod": "stripe",
  "notes": "Please deliver in the morning",
  "couponCode": "SAVE10"
}
```

#### Get Orders
```http
GET /orders?page=1&limit=20&status=pending
Authorization: Bearer <token>
```

#### Get Single Order
```http
GET /orders/1
Authorization: Bearer <token>
```

#### Cancel Order
```http
PUT /orders/1/cancel
Authorization: Bearer <token>
```

### Wishlist

#### Get Wishlist
```http
GET /wishlist
Authorization: Bearer <token>
```

#### Add to Wishlist
```http
POST /wishlist
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": 1
}
```

#### Remove from Wishlist
```http
DELETE /wishlist/1
Authorization: Bearer <token>
```

### Notifications

#### Get Notifications
```http
GET /notifications?page=1&limit=20&unreadOnly=false
Authorization: Bearer <token>
```

#### Mark as Read
```http
PUT /notifications/1/read
Authorization: Bearer <token>
```

#### Mark All as Read
```http
PUT /notifications/read-all
Authorization: Bearer <token>
```

#### Delete Notification
```http
DELETE /notifications/1
Authorization: Bearer <token>
```

## Payment Endpoints

### Create Payment Intent
```http
POST /payments/create-payment-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 500000,
  "currency": "vnd",
  "orderId": 1
}
```

### Confirm Payment
```http
POST /payments/confirm-payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentIntentId": "pi_1234567890",
  "orderId": 1
}
```

### Cancel Payment
```http
POST /payments/cancel-payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentIntentId": "pi_1234567890"
}
```

### Refund Payment
```http
POST /payments/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentIntentId": "pi_1234567890",
  "amount": 100000,
  "reason": "requested_by_customer"
}
```

## Admin Endpoints

### Get Orders (Admin)
```http
GET /admin/orders?page=1&limit=20&status=pending
Authorization: Bearer <admin-token>
```

### Get Products (Admin)
```http
GET /admin/products?page=1&limit=20
Authorization: Bearer <admin-token>
```

### Create Product (Admin)
```http
POST /admin/products
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "New Product",
  "description": "Product description",
  "price": 100000,
  "categoryId": 1,
  "brandId": 1,
  "stockQuantity": 100
}
```

### Update Product (Admin)
```http
PUT /admin/products/1
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Updated Product",
  "price": 120000
}
```

### Delete Product (Admin)
```http
DELETE /admin/products/1
Authorization: Bearer <admin-token>
```

### Get Users (Admin)
```http
GET /admin/users?page=1&limit=20
Authorization: Bearer <admin-token>
```

### Get Statistics (Admin)
```http
GET /admin/statistics
Authorization: Bearer <admin-token>
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Access token required"
}
```

### 403 Forbidden
```json
{
  "error": "Admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Product not found",
  "message": "The requested product does not exist"
}
```

### 409 Conflict
```json
{
  "error": "User already exists",
  "message": "An account with this email already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An error occurred while processing your request"
}
```

## Rate Limiting

API có rate limiting để bảo vệ khỏi abuse:
- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: 
  - `X-RateLimit-Limit`: Số request tối đa
  - `X-RateLimit-Remaining`: Số request còn lại
  - `X-RateLimit-Reset`: Thời gian reset

## Webhooks

### Stripe Webhook
```http
POST /webhooks/stripe
Content-Type: application/json
Stripe-Signature: <signature>

{
  "id": "evt_1234567890",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "amount": 500000,
      "currency": "vnd"
    }
  }
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get products
const products = await api.get('/products?page=1&limit=20');

// Add to cart
await api.post('/cart/add', {
  productId: 1,
  quantity: 2
});
```

### Python
```python
import requests

class TMDTAPI:
    def __init__(self, base_url, token=None):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Content-Type': 'application/json'
        }
        if token:
            self.headers['Authorization'] = f'Bearer {token}'
    
    def get_products(self, page=1, limit=20):
        response = requests.get(
            f'{self.base_url}/products',
            params={'page': page, 'limit': limit},
            headers=self.headers
        )
        return response.json()
    
    def add_to_cart(self, product_id, quantity=1):
        response = requests.post(
            f'{self.base_url}/cart/add',
            json={'productId': product_id, 'quantity': quantity},
            headers=self.headers
        )
        return response.json()

# Usage
api = TMDTAPI('http://localhost:3000/api', 'your-token')
products = api.get_products()
```

## Testing

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "services": ["auth", "user", "product", "payment", "admin", "search", "chat", "order", "notification"]
}
```

### Load Testing
Sử dụng Artillery để test load:
```bash
artillery run load-tests/load-test.yml
```

## Support

- **Email**: api-support@tmdt.com
- **Documentation**: https://docs.tmdt.com/api
- **Status Page**: https://status.tmdt.com

