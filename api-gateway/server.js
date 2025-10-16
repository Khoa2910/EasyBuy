const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const redis = require('redis');
const winston = require('winston');
require('dotenv').config();

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Initialize Redis client
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis Client Connected');
});

// Service URLs
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
  product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003',
  admin: process.env.ADMIN_SERVICE_URL || 'http://localhost:3005',
  search: process.env.SEARCH_SERVICE_URL || 'http://localhost:3006',
  chat: process.env.CHAT_SERVICE_URL || 'http://localhost:3007',
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:3004',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3009'
};

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for product images
const staticDir = path.join(__dirname, '..', 'public');
app.use('/static', express.static(staticDir));

// Static file serving for frontend
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// Debug endpoint to verify static path and file existence
app.get('/static-debug', (req, res) => {
  const fs = require('fs');
  const testFile = path.join(staticDir, 'products', 'avaa2.webp');
  res.json({
    staticDir,
    exists: fs.existsSync(staticDir),
    testFile,
    testExists: fs.existsSync(testFile)
  });
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000) || 900
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: Object.keys(SERVICES)
  });
});

// JWT verification middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Check Redis cache first
    const cachedUser = await redisClient.get(`user:${token}`);
    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
      return next();
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Cache user data
    await redisClient.setEx(`user:${token}`, 3600, JSON.stringify(decoded));
    
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Admin verification middleware
const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Service proxy function
const createServiceProxy = (serviceName, basePath = '') => {
  return async (req, res) => {
    try {
      const serviceUrl = SERVICES[serviceName];
      if (!serviceUrl) {
        return res.status(503).json({ error: 'Service unavailable' });
      }

      const targetUrl = `${serviceUrl}${basePath}${req.path}`;
      const method = req.method;
      const headers = { ...req.headers };
      
      // Remove host header to avoid conflicts
      delete headers.host;

      const config = {
        method,
        url: targetUrl,
        headers,
        data: req.body,
        params: req.query,
        timeout: 30000 // 30 seconds timeout
      };

      logger.info(`Proxying ${method} ${req.path} to ${serviceName} service`);
      
      const response = await axios(config);
      
      // Cache successful responses for GET requests
      if (method === 'GET' && response.status === 200) {
        const cacheKey = `api:${serviceName}:${req.originalUrl}`;
        await redisClient.setEx(cacheKey, 300, JSON.stringify(response.data)); // 5 minutes cache
      }

      res.status(response.status).json(response.data);
    } catch (error) {
      logger.error(`Service proxy error for ${serviceName}:`, error.message);
      
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else if (error.code === 'ECONNREFUSED') {
        res.status(503).json({ error: `${serviceName} service is unavailable` });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
};

// Cache middleware for GET requests
const cacheMiddleware = async (req, res, next) => {
  if (req.method === 'GET') {
    try {
      const cacheKey = `api:cache:${req.originalUrl}`;
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        logger.info(`Cache hit for ${req.originalUrl}`);
        return res.json(JSON.parse(cached));
      }
    } catch (error) {
      logger.error('Cache middleware error:', error);
    }
  }
  next();
};

// Mock cart API for testing (must be before protected routes)
app.get('/api/cart', (req, res) => {
  res.json({
    items: [
      {
        id: 1,
        productId: 1,
        productName: 'Máy nước nóng Ariston 15L',
        productImage: 'assets/images/products/water-heater.jpg',
        price: 2990000,
        quantity: 1,
        subtotal: 2990000
      }
    ],
    subtotal: 2990000,
    itemCount: 1
  });
});

app.post('/api/cart/add', (req, res) => {
  res.json({ message: 'Item added to cart' });
});

// API Routes

// Public routes (no authentication required)
app.use('/api/auth', createServiceProxy('auth'));
app.use('/api/products', cacheMiddleware, createServiceProxy('product'));
app.use('/api/search', cacheMiddleware, createServiceProxy('search'));
app.use('/api/categories', cacheMiddleware, createServiceProxy('product', '/categories'));
app.use('/api/brands', cacheMiddleware, createServiceProxy('product', '/brands'));

// Protected routes (authentication required)
app.use('/api/user', verifyToken, createServiceProxy('user'));
app.use('/api/cart', verifyToken, createServiceProxy('order', '/cart'));
app.use('/api/orders', verifyToken, createServiceProxy('order', '/orders'));
app.use('/api/wishlist', verifyToken, createServiceProxy('user', '/wishlist'));
app.use('/api/notifications', verifyToken, createServiceProxy('notification'));
app.use('/api/chat', verifyToken, createServiceProxy('chat'));

// Payment routes (authentication required)
app.use('/api/payments', verifyToken, createServiceProxy('payment'));

// Admin routes (admin authentication required)
// Admin order routes handled by order-service
app.post('/api/admin/orders/:id/cancel', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const target = `${SERVICES.order}/admin/orders/${req.params.id}/cancel`;
    const response = await axios.post(target, req.body, { headers: { Authorization: req.headers.authorization } });
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Gateway error' });
    }
  }
});
app.use('/api/admin/orders', verifyToken, verifyAdmin, createServiceProxy('order', '/admin/orders'));
// Other admin routes
app.use('/api/admin', verifyToken, verifyAdmin, createServiceProxy('admin'));

// Webhook routes (no authentication, but should verify webhook signatures)
app.use('/api/webhooks', createServiceProxy('payment', '/webhooks'));

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await redisClient.quit();
  process.exit(0);
});

// Start server
app.listen(PORT, async () => {
  try {
    await redisClient.connect();
    logger.info(`API Gateway running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
});

module.exports = app;

