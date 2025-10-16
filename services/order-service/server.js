const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mysql = require('mysql2/promise');
const redis = require('redis');
const { body, query, validationResult } = require('express-validator');
const winston = require('winston');
const axios = require('axios');
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

// Initialize Redis client
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

// Database connection
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'tmdt_user',
  password: process.env.MYSQL_PASSWORD || 'tmdt_password',
  database: process.env.MYSQL_DATABASE || 'easybuy',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Access denied', 
      message: 'No token provided' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ 
      success: false,
      error: 'Invalid token', 
      message: 'Token is not valid' 
    });
  }
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Admin privileges required'
    });
  }
  next();
};

// ===== CART MANAGEMENT =====

// Get cart items
app.get('/cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [cartItems] = await pool.execute(`
      SELECT 
        ci.id,
        ci.product_id,
        ci.variant_id,
        ci.quantity,
        ci.created_at,
        p.name as product_name,
        p.price as product_price,
        p.sale_price,
        p.is_on_sale,
        p.image_url as product_image,
        p.stock_quantity,
        pv.name as variant_name,
        pv.price as variant_price
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_variants pv ON ci.variant_id = pv.id
      WHERE ci.user_id = ? AND p.is_active = TRUE
      ORDER BY ci.created_at DESC
    `, [userId]);

    // Calculate totals
    let subtotal = 0;
    const items = cartItems.map(item => {
      const price = item.variant_price || item.sale_price || item.product_price;
      const total = price * item.quantity;
      subtotal += total;

      return {
        id: item.id,
        productId: item.product_id,
        variantId: item.variant_id,
        productName: item.product_name,
        productImage: item.product_image,
        variantName: item.variant_name,
        quantity: item.quantity,
        unitPrice: price,
        totalPrice: total,
        stockQuantity: item.stock_quantity,
        isOnSale: item.is_on_sale
      };
    });

    res.json({
      success: true,
      items,
      subtotal,
      itemCount: items.length
    });

  } catch (error) {
    logger.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cart',
      message: 'An error occurred while fetching cart items'
    });
  }
});

// Add item to cart
app.post('/cart/add', [
  body('productId').isInt().withMessage('Product ID must be an integer'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('variantId').optional().isInt().withMessage('Variant ID must be an integer')
], validateRequest, authenticateToken, async (req, res) => {
  try {
    const { productId, quantity, variantId } = req.body;
    const userId = req.user.id;

    // Check if product exists
    const [products] = await pool.execute(
      'SELECT * FROM products WHERE id = ? AND is_active = TRUE',
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const product = products[0];
    const price = product.sale_price || product.price;

    // Check stock
    if (product.stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock',
        message: `Only ${product.stock_quantity} units available`
      });
    }

    // Check if item already exists
    const [existingItems] = await pool.execute(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND variant_id = ?',
      [userId, productId, variantId || null]
    );

    if (existingItems.length > 0) {
      // Update quantity
      const newQuantity = existingItems[0].quantity + quantity;
      await pool.execute(
        'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ?',
        [newQuantity, existingItems[0].id]
      );

      res.json({
        success: true,
        message: 'Item quantity updated in cart',
        itemId: existingItems[0].id,
        quantity: newQuantity
      });
    } else {
      // Add new item
      const [result] = await pool.execute(
        'INSERT INTO cart_items (user_id, product_id, variant_id, quantity, price, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [userId, productId, variantId || null, quantity, price]
      );

      res.status(201).json({
        success: true,
        message: 'Item added to cart',
        itemId: result.insertId,
        quantity
      });
    }

  } catch (error) {
    logger.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add item to cart'
    });
  }
});

// Update cart item quantity
app.put('/cart/update/:itemId', [
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], validateRequest, authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    // Check if item exists
    const [cartItems] = await pool.execute(
      'SELECT * FROM cart_items WHERE id = ? AND user_id = ?',
      [itemId, userId]
    );

    if (cartItems.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cart item not found'
      });
    }

    // Update quantity
    await pool.execute(
      'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ?',
      [quantity, itemId]
    );

    res.json({
      success: true,
      message: 'Cart item updated',
      itemId: parseInt(itemId),
      quantity
    });

  } catch (error) {
    logger.error('Update cart item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cart item'
    });
  }
});

// Remove item from cart
app.delete('/cart/remove/:itemId', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    const [result] = await pool.execute(
      'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
      [itemId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cart item not found'
      });
    }

    res.json({
      success: true,
      message: 'Item removed from cart',
      itemId: parseInt(itemId)
    });

  } catch (error) {
    logger.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove item from cart'
    });
  }
});

// Clear cart
app.delete('/cart/clear', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.execute('DELETE FROM cart_items WHERE user_id = ?', [userId]);

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });

  } catch (error) {
    logger.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cart'
    });
  }
});

// Get cart count
app.get('/cart/count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [result] = await pool.execute(
      'SELECT COUNT(*) as count FROM cart_items WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      count: result[0].count
    });

  } catch (error) {
    logger.error('Get cart count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cart count'
    });
  }
});

// ===== ORDER MANAGEMENT =====

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `EASY${timestamp}${random}`;
};

// Create order
app.post('/orders', [
  body('shippingAddress').isObject().withMessage('Shipping address is required'),
  body('billingAddress').isObject().withMessage('Billing address is required'),
  body('paymentMethod').isString().withMessage('Payment method is required')
], validateRequest, authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { shippingAddress, billingAddress, paymentMethod, notes, couponCode } = req.body;
    const userId = req.user.id;

    // Get cart items
    const [cartItems] = await connection.execute(`
      SELECT 
        ci.*,
        p.name as product_name,
        p.sku as product_sku,
        p.price as product_price,
        p.sale_price,
        p.is_on_sale,
        pv.name as variant_name,
        pv.sku as variant_sku,
        pv.price as variant_price
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_variants pv ON ci.variant_id = pv.id
      WHERE ci.user_id = ? AND p.is_active = TRUE
    `, [userId]);

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Empty cart',
        message: 'Cannot create order with empty cart'
      });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = cartItems.map(item => {
      const price = item.variant_price || item.sale_price || item.product_price;
      const total = price * item.quantity;
      subtotal += total;

      return {
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_name: item.product_name,
        product_sku: item.variant_sku || item.product_sku,
        quantity: item.quantity,
        unit_price: price,
        total_price: total
      };
    });

    const shipping = subtotal > 500000 ? 0 : 30000; // Free shipping over 500k
    const tax = subtotal * 0.1; // 10% tax
    const totalAmount = subtotal + shipping + tax;

    // Create order
    const orderNumber = generateOrderNumber();
    const [orderResult] = await connection.execute(`
      INSERT INTO orders (user_id, order_number, status, payment_status, subtotal, shipping_cost, tax_amount, total_amount, shipping_address, billing_address, payment_method, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      userId, orderNumber, 'pending', 'pending', subtotal, shipping, tax, totalAmount,
      JSON.stringify(shippingAddress), JSON.stringify(billingAddress), paymentMethod, notes || null
    ]);

    const orderId = orderResult.insertId;

    // Create order items
    for (const item of orderItems) {
      await connection.execute(`
        INSERT INTO order_items (order_id, product_id, variant_id, product_name, product_sku, quantity, unit_price, total_price, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        orderId, item.product_id, item.variant_id, item.product_name, item.product_sku,
        item.quantity, item.unit_price, item.total_price
      ]);
    }

    // Clear cart
    await connection.execute('DELETE FROM cart_items WHERE user_id = ?', [userId]);

    await connection.commit();

    // Notify payment service
    try {
      await axios.post(`${process.env.PAYMENT_SERVICE_URL}/create-payment-intent`, {
        amount: totalAmount,
        currency: 'vnd',
        orderId: orderId,
        orderNumber: orderNumber
      });
    } catch (notificationError) {
      logger.error('Failed to notify payment service:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        id: orderId,
        orderNumber: orderNumber,
        status: 'pending',
        totalAmount: totalAmount
      }
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Create order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  } finally {
    connection.release();
  }
});

// Get user orders
app.get('/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [orders] = await pool.execute(`
      SELECT 
        o.*,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      orders
    });

  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

// Get single order
app.get('/orders/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [orders] = await pool.execute(`
      SELECT * FROM orders WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const order = orders[0];

    // Get order items
    const [orderItems] = await pool.execute(`
      SELECT * FROM order_items WHERE order_id = ?
    `, [id]);

    order.items = orderItems;

    res.json({
      success: true,
      order
    });

  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
});

// ===== USER ORDER ACTIONS =====

// Cancel order (user)
app.post('/orders/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body || {};

    // Ensure order exists and belongs to user
    const [orders] = await pool.execute(
      'SELECT id, status, payment_status FROM orders WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orders[0];
    // Attempt to cancel (guard against delivered/cancelled)
    const [result] = await pool.execute(
      "UPDATE orders SET status = 'cancelled', payment_status = CASE WHEN payment_status = 'paid' THEN 'refund_pending' ELSE 'cancelled' END, notes = CONCAT(IFNULL(notes, ''), ?) , updated_at = NOW() WHERE id = ? AND user_id = ?",
      [reason ? `\n[${new Date().toISOString()}] User cancelled: ${reason}` : `\n[${new Date().toISOString()}] User cancelled`, id, userId]
    );

    if (result.affectedRows === 0) {
      // Provide diagnostic details to client
      const [[current]] = await pool.query('SELECT status, user_id FROM orders WHERE id = ?', [id]);
      const reasonText = current ? `status=${current.status}, owner=${current.user_id}, you=${userId}` : 'order_not_found_after_update';
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel order',
        message: 'Order cannot be cancelled',
        details: reasonText
      });
    }

    return res.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    logger.error('Cancel order error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel order' });
  }
});

// ===== ADMIN ORDER MANAGEMENT =====

// Update order status (admin)
app.put('/admin/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, paymentStatus } = req.body || {};

    const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    const allowedPaymentStatuses = ['pending', 'paid', 'failed', 'refund_pending', 'refunded', 'cancelled'];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    if (paymentStatus && !allowedPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid payment status' });
    }

    // Ensure order exists
    const [orders] = await pool.execute('SELECT id FROM orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Build update
    const fields = ['status = ?'];
    const values = [status];
    if (paymentStatus) {
      fields.push('payment_status = ?');
      values.push(paymentStatus);
    }
    // Append note to notes column
    const noteText = note ? `\n[${new Date().toISOString()}] Admin: ${note}` : `\n[${new Date().toISOString()}] Admin set status to ${status}`;
    fields.push('notes = CONCAT(IFNULL(notes, ""), ?)');
    values.push(noteText);
    fields.push('updated_at = NOW()');
    values.push(id);

    await pool.execute(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, values);

    return res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    logger.error('Admin update order status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

// Get orders list for admin with basic filters
app.get('/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, q, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const where = [];
    const params = [];
    if (status) {
      where.push('o.status = ?');
      params.push(status);
    }
    if (q) {
      where.push('(o.order_number LIKE ? OR u.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT o.*, u.email as user_email, COUNT(oi.id) as item_count
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       ${whereSql}
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );

    res.json({ success: true, orders: rows, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (error) {
    logger.error('Admin list orders error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// Admin cancel order
app.post('/admin/orders/:id/cancel', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    // Try to cancel unless already delivered/cancelled
    const [result] = await pool.execute(
      "UPDATE orders SET status = 'cancelled', payment_status = CASE WHEN payment_status = 'paid' THEN 'refund_pending' ELSE 'cancelled' END, notes = CONCAT(IFNULL(notes, ''), ?) , updated_at = NOW() WHERE id = ? AND status NOT IN ('delivered','cancelled')",
      [reason ? `\n[${new Date().toISOString()}] Admin cancelled: ${reason}` : `\n[${new Date().toISOString()}] Admin cancelled`, id]
    );

    if (result.affectedRows === 0) {
      const [[current]] = await pool.query('SELECT status FROM orders WHERE id = ?', [id]);
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel order',
        message: 'Order cannot be cancelled',
        details: current ? `status=${current.status}` : 'order_not_found'
      });
    }

    return res.json({ success: true, message: 'Order cancelled by admin' });
  } catch (error) {
    logger.error('Admin cancel order error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel order' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'order-service',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
app.listen(PORT, async () => {
  try {
    await redisClient.connect();
    logger.info(`Order Service running on port ${PORT}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
});

module.exports = app;