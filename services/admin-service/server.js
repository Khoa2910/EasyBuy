const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mysql = require('mysql2/promise');
const redis = require('redis');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const jwt = require('jsonwebtoken');
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

// Redis disabled for simple setup
let redisClient = null;
let redisConnected = false;

// Skip Redis initialization to avoid connection errors
logger.info('Redis caching disabled - running in simple mode');

// Database connection
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'tmdt_user',
  password: process.env.MYSQL_PASSWORD || 'tmdt_password',
  database: process.env.MYSQL_DATABASE || 'tmdt_ecommerce',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.user = user;
    next();
  });
};

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Dashboard Statistics
app.get('/statistics', authenticateToken, async (req, res) => {
  try {
    // Get total revenue
    const [revenueResult] = await pool.execute(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END), 0) as completed_revenue
      FROM orders 
      WHERE status != 'cancelled'
    `);

    // Get total orders
    const [ordersResult] = await pool.execute(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
        COUNT(CASE WHEN status = 'delivering' THEN 1 END) as delivering_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
      FROM orders
    `);

    // Get total users
    const [usersResult] = await pool.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users_30d,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_users_7d
      FROM users 
      WHERE role = 'customer'
    `);

    // Get total products
    const [productsResult] = await pool.execute(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_products,
        COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as in_stock_products
      FROM products
    `);

    // Get revenue growth (compare with previous month)
    const [revenueGrowthResult] = await pool.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW()) THEN total_amount ELSE 0 END), 0) as current_month,
        COALESCE(SUM(CASE WHEN MONTH(created_at) = MONTH(NOW()) - 1 AND YEAR(created_at) = YEAR(NOW()) THEN total_amount ELSE 0 END), 0) as previous_month
      FROM orders 
      WHERE status = 'delivered'
    `);

    // Get orders growth
    const [ordersGrowthResult] = await pool.execute(`
      SELECT 
        COUNT(CASE WHEN MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW()) THEN 1 END) as current_month,
        COUNT(CASE WHEN MONTH(created_at) = MONTH(NOW()) - 1 AND YEAR(created_at) = YEAR(NOW()) THEN 1 END) as previous_month
      FROM orders
    `);

    // Get users growth
    const [usersGrowthResult] = await pool.execute(`
      SELECT 
        COUNT(CASE WHEN MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW()) THEN 1 END) as current_month,
        COUNT(CASE WHEN MONTH(created_at) = MONTH(NOW()) - 1 AND YEAR(created_at) = YEAR(NOW()) THEN 1 END) as previous_month
      FROM users 
      WHERE role = 'customer'
    `);

    // Get products growth
    const [productsGrowthResult] = await pool.execute(`
      SELECT 
        COUNT(CASE WHEN MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW()) THEN 1 END) as current_month,
        COUNT(CASE WHEN MONTH(created_at) = MONTH(NOW()) - 1 AND YEAR(created_at) = YEAR(NOW()) THEN 1 END) as previous_month
      FROM products
    `);

    // Calculate growth percentages
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    const revenueGrowth = calculateGrowth(
      revenueGrowthResult[0].current_month, 
      revenueGrowthResult[0].previous_month
    );

    const ordersGrowth = calculateGrowth(
      ordersGrowthResult[0].current_month, 
      ordersGrowthResult[0].previous_month
    );

    const usersGrowth = calculateGrowth(
      usersGrowthResult[0].current_month, 
      usersGrowthResult[0].previous_month
    );

    const productsGrowth = calculateGrowth(
      productsGrowthResult[0].current_month, 
      productsGrowthResult[0].previous_month
    );

    const statistics = {
      totalRevenue: revenueResult[0].total_revenue,
      completedRevenue: revenueResult[0].completed_revenue,
      totalOrders: ordersResult[0].total_orders,
      pendingOrders: ordersResult[0].pending_orders,
      confirmedOrders: ordersResult[0].confirmed_orders,
      deliveringOrders: ordersResult[0].delivering_orders,
      deliveredOrders: ordersResult[0].delivered_orders,
      cancelledOrders: ordersResult[0].cancelled_orders,
      totalUsers: usersResult[0].total_users,
      newUsers30d: usersResult[0].new_users_30d,
      newUsers7d: usersResult[0].new_users_7d,
      totalProducts: productsResult[0].total_products,
      activeProducts: productsResult[0].active_products,
      inStockProducts: productsResult[0].in_stock_products,
      revenueGrowth: parseFloat(revenueGrowth),
      ordersGrowth: parseFloat(ordersGrowth),
      usersGrowth: parseFloat(usersGrowth),
      productsGrowth: parseFloat(productsGrowth)
    };

    // Cache statistics for 5 minutes (if Redis is available)
    if (redisConnected && redisClient) {
      try {
        await redisClient.setEx('admin:statistics', 300, JSON.stringify(statistics));
      } catch (error) {
        logger.warn('Failed to cache statistics:', error.message);
      }
    }

    res.json(statistics);

  } catch (error) {
    logger.error('Get statistics error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: 'An error occurred while fetching dashboard statistics'
    });
  }
});

// Revenue Data
app.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;

    let query, labels;
    
    if (period === 'monthly') {
      query = `
        SELECT 
          MONTH(created_at) as month,
          YEAR(created_at) as year,
          SUM(total_amount) as revenue
        FROM orders 
        WHERE status = 'delivered' 
          AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY YEAR(created_at), MONTH(created_at)
        ORDER BY year, month
      `;
      labels = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
    } else if (period === 'daily') {
      query = `
        SELECT 
          DATE(created_at) as date,
          SUM(total_amount) as revenue
        FROM orders 
        WHERE status = 'delivered' 
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
      `;
      labels = Array.from({length: 30}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      });
    } else {
      return res.status(400).json({ error: 'Invalid period. Use "monthly" or "daily"' });
    }

    const [results] = await pool.execute(query);
    
    const revenueData = {
      labels: labels,
      monthly: results.map(row => row.revenue || 0),
      total: results.reduce((sum, row) => sum + (row.revenue || 0), 0)
    };

    res.json(revenueData);

  } catch (error) {
    logger.error('Get revenue data error:', error);
    res.status(500).json({
      error: 'Failed to fetch revenue data',
      message: 'An error occurred while fetching revenue information'
    });
  }
});

// Recent Orders
app.get('/orders', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      search = '',
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    // Filter by status
    if (status) {
      whereClause += ' AND o.status = ?';
      queryParams.push(status);
    }

    // Search by order ID or customer email
    if (search) {
      whereClause += ' AND (o.id LIKE ? OR u.email LIKE ? OR CONCAT(u.first_name, " ", u.last_name) LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Get orders with user information
    const [orders] = await pool.execute(`
      SELECT 
        o.id,
        o.total_amount,
        o.status,
        o.created_at,
        o.updated_at,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.${sort} ${order}
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
    `, queryParams);

    // Get order items for each order
    for (let order of orders) {
      const [items] = await pool.execute(`
        SELECT 
          oi.quantity,
          oi.unit_price,
          oi.total_price,
          p.name as product_name,
          p.sku as product_sku,
          pi.image_url
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
        WHERE oi.order_id = ?
      `, [order.id]);
      
      order.items = items;
    }

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: 'An error occurred while fetching orders'
    });
  }
});

// Get single order details
app.get('/orders/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;

    // Get order details
    const [orders] = await pool.execute(`
      SELECT 
        o.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [orderId]);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Get order items
    const [items] = await pool.execute(`
      SELECT 
        oi.*,
        p.name as product_name,
        p.sku as product_sku,
        pi.image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      WHERE oi.order_id = ?
    `, [orderId]);

    order.items = items;

    res.json({
      order,
      user: {
        first_name: order.first_name,
        last_name: order.last_name,
        email: order.email,
        phone: order.phone
      },
      items
    });

  } catch (error) {
    logger.error('Get order details error:', error);
    res.status(500).json({
      error: 'Failed to fetch order details',
      message: 'An error occurred while fetching order information'
    });
  }
});

// Update order status
app.put('/orders/:id/status', authenticateToken, [
  body('status').isIn(['pending', 'confirmed', 'delivering', 'delivered', 'cancelled']).withMessage('Invalid status')
], validateRequest, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    // Get current order status
    const [currentOrder] = await pool.execute(
      'SELECT status FROM orders WHERE id = ?',
      [orderId]
    );

    if (currentOrder.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentStatus = currentOrder[0].status;

    // Validate status transition
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['delivering', 'cancelled'],
      'delivering': ['delivered'],
      'delivered': ['completed'],
      'completed': [],
      'cancelled': []
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status transition',
        message: `Cannot change status from ${currentStatus} to ${status}`
      });
    }

    // Update order status
    await pool.execute(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, orderId]
    );

    // Log status change
    logger.info(`Order ${orderId} status changed from ${currentStatus} to ${status} by admin ${req.user.id}`);

    res.json({
      message: 'Order status updated successfully',
      orderId,
      oldStatus: currentStatus,
      newStatus: status
    });

  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(500).json({
      error: 'Failed to update order status',
      message: 'An error occurred while updating order status'
    });
  }
});

// Get users
app.get('/users', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      role = '', 
      search = '',
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    // Filter by role
    if (role) {
      whereClause += ' AND role = ?';
      queryParams.push(role);
    }

    // Search by name or email
    if (search) {
      whereClause += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const [users] = await pool.execute(`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        is_active,
        created_at,
        updated_at
      FROM users
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `, queryParams);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: 'An error occurred while fetching users'
    });
  }
});

// Get products
app.get('/products', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category = '', 
      brand = '',
      search = '',
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    // Filter by category
    if (category) {
      whereClause += ' AND p.category_id = ?';
      queryParams.push(category);
    }

    // Filter by brand
    if (brand) {
      whereClause += ' AND p.brand_id = ?';
      queryParams.push(brand);
    }

    // Search by name or description
    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm);
    }

    const [products] = await pool.execute(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.is_active,
        p.created_at,
        p.updated_at,
        c.name as category_name,
        b.name as brand_name,
        pi.image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      ${whereClause}
      ORDER BY p.${sort} ${order}
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `, queryParams);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    logger.error('Get products error:', error);
    res.status(500).json({
      error: 'Failed to fetch products',
      message: 'An error occurred while fetching products'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'admin-service',
    timestamp: new Date().toISOString()
  });
});

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

// Start server
app.listen(PORT, () => {
  logger.info(`Admin Service running on port ${PORT}`);
  logger.info('Dashboard statistics available at /statistics');
  logger.info('Redis caching disabled - running in simple mode');
});

module.exports = app;

