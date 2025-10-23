require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const EmailService = require('./services/email-service');

const app = express();
const PORT = 3000;

// Initialize Email Service
const emailService = new EmailService();

// OTP Functions (sử dụng lại logic đã có)
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email (sử dụng lại cấu hình Gmail đã có)
const nodemailer = require('nodemailer');

// Email configuration - sử dụng lại cấu hình Gmail đã có
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'easybuy082025@gmail.com', // Email Gmail đã cấu hình
    pass: 'jagh zbig zsvb xzfq' // App password đã cấu hình
  }
});

const sendOTPEmail = async (email, otp, type) => {
  const subject = type === 'password_reset' ? 'Đặt lại mật khẩu EasyBuy' : 'Mã OTP EasyBuy';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #007bff;">EasyBuy</h2>
      <h3>${subject}</h3>
      <p>Xin chào,</p>
      <p>Mã OTP của bạn là: <strong style="font-size: 24px; color: #007bff;">${otp}</strong></p>
      <p>Mã này có hiệu lực trong 5 phút.</p>
      <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">Email này được gửi tự động từ hệ thống EasyBuy.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: 'EasyBuy <easybuy082025@gmail.com>',
      to: email,
      subject: subject,
      html: html
    });
    
    console.log(`✅ OTP sent to ${email}: ${otp}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    return false;
  }
};

// Send order notification email
const sendOrderNotificationEmail = async (email, orderData, status) => {
  const statusMessages = {
    'pending': {
      subject: 'Đơn hàng đã được đặt thành công - EasyBuy',
      title: 'Đơn hàng đã được đặt thành công',
      message: 'Cảm ơn bạn đã đặt hàng! Đơn hàng của bạn đã được tiếp nhận và đang chờ xác nhận.',
      color: '#007bff'
    },
    'confirmed': {
      subject: 'Đơn hàng đã được xác nhận - EasyBuy',
      title: 'Đơn hàng đã được xác nhận',
      message: 'Đơn hàng của bạn đã được xác nhận và đang được chuẩn bị giao hàng.',
      color: '#28a745'
    },
    'delivering': {
      subject: 'Đơn hàng đang được giao - EasyBuy',
      title: 'Đơn hàng đang được giao',
      message: 'Đơn hàng của bạn đã được giao cho đơn vị vận chuyển và đang trên đường đến bạn.',
      color: '#17a2b8'
    },
    'delivered': {
      subject: 'Đơn hàng đã giao thành công - EasyBuy',
      title: 'Đơn hàng đã giao thành công',
      message: 'Đơn hàng của bạn đã được giao thành công. Cảm ơn bạn đã mua sắm tại EasyBuy!',
      color: '#28a745'
    },
    'completed': {
      subject: 'Đơn hàng hoàn tất - EasyBuy',
      title: 'Đơn hàng hoàn tất',
      message: 'Đơn hàng của bạn đã hoàn tất. Bạn có thể đánh giá sản phẩm và mua sắm thêm.',
      color: '#6f42c1'
    },
    'cancelled': {
      subject: 'Đơn hàng đã bị hủy - EasyBuy',
      title: 'Đơn hàng đã bị hủy',
      message: 'Đơn hàng của bạn đã bị hủy. Nếu bạn có thắc mắc, vui lòng liên hệ với chúng tôi.',
      color: '#dc3545'
    }
  };

  const statusInfo = statusMessages[status] || {
    subject: 'Cập nhật đơn hàng - EasyBuy',
    title: 'Cập nhật đơn hàng',
    message: 'Trạng thái đơn hàng của bạn đã được cập nhật.',
    color: '#007bff'
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">EasyBuy</h1>
        <p style="margin: 5px 0 0; opacity: 0.9;">Thông báo đơn hàng</p>
      </div>
      
      <div style="padding: 30px;">
        <h2 style="color: ${statusInfo.color}; margin-top: 0;">${statusInfo.title}</h2>
        <p>Xin chào <strong>${orderData.user.first_name} ${orderData.user.last_name}</strong>,</p>
        <p>${statusInfo.message}</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Thông tin đơn hàng</h3>
          <p><strong>Mã đơn hàng:</strong> #${orderData.order.id}</p>
          <p><strong>Ngày đặt:</strong> ${new Date(orderData.order.created_at).toLocaleDateString('vi-VN')}</p>
          <p><strong>Tổng tiền:</strong> ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(orderData.order.total_amount)}</p>
          <p><strong>Trạng thái:</strong> <span style="color: ${statusInfo.color}; font-weight: bold;">${getStatusText(status)}</span></p>
        </div>
        
        <div style="margin: 20px 0;">
          <h3 style="color: #333;">Sản phẩm đã đặt:</h3>
          ${orderData.items.map(item => `
            <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee;">
              <img src="${item.image_url}" alt="${item.product_name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; margin-right: 15px;">
              <div>
                <p style="margin: 0; font-weight: bold;">${item.product_name}</p>
                <p style="margin: 5px 0; color: #666;">Số lượng: ${item.quantity}</p>
                <p style="margin: 0; color: #007bff; font-weight: bold;">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}</p>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:3000/orders.html" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Xem chi tiết đơn hàng
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Cảm ơn bạn đã tin tưởng và mua sắm tại EasyBuy!<br>
          Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi.
        </p>
      </div>
      
      <div style="background: #f8f9fa; color: #666; padding: 15px; text-align: center; font-size: 12px;">
        © 2025 EasyBuy. Tất cả quyền được bảo lưu.
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: 'EasyBuy <easybuy082025@gmail.com>',
      to: email,
      subject: statusInfo.subject,
      html: html
    });
    
    console.log(`✅ Order notification sent to ${email} for order #${orderData.order.id} - Status: ${status}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending order notification email:', error);
    return false;
  }
};

// Helper function to get status text in Vietnamese
const getStatusText = (status) => {
  const statusTexts = {
    'pending': 'Chờ xác nhận',
    'confirmed': 'Đã xác nhận',
    'delivering': 'Đang giao hàng',
    'delivered': 'Đã giao hàng',
    'completed': 'Hoàn tất',
    'cancelled': 'Đã hủy'
  };
  return statusTexts[status] || status;
};

// Database connection
const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'easybuy',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Ensure product_reviews table exists (simple reviews feature)
async function ensureReviewsTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        order_id INT NOT NULL,
        rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_order_product (user_id, order_id, product_id),
        INDEX idx_product_id (product_id)
      ) ENGINE=InnoDB;
    `);
  } catch (e) {
    console.error('Failed to ensure product_reviews table:', e);
  }
}

ensureReviewsTable();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));
app.use('/static', express.static('public'));

// JWT Secret
const JWT_SECRET = 'your-secret-key-change-in-production';

// JWT Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'EasyBuy Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Update last login
    await pool.execute(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    // Generate tokens
    const accessToken = generateToken(user);

    console.log(`User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isEmailVerified: user.is_email_verified,
        avatarUrl: user.avatar_url
      },
      accessToken,
      token: accessToken // For compatibility
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

// Product routes
app.get('/api/products/featured', async (req, res) => {
  try {
    const [products] = await pool.execute(`
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        pi.image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE p.is_active = TRUE AND p.is_featured = TRUE
      ORDER BY p.created_at DESC
      LIMIT 8
    `);

    // Add default image if no image_url
    const productsWithImages = products.map(product => ({
      ...product,
      imageUrl: product.image_url || 'assets/images/placeholder.jpg',
      primary_image: product.image_url || 'assets/images/placeholder.jpg'
    }));

    res.json(productsWithImages);
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
});

app.get('/api/products/bestsellers', async (req, res) => {
  try {
    const [products] = await pool.execute(`
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        pi.image_url,
        COALESCE(SUM(oi.quantity), 0) as total_sold
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
      WHERE p.is_active = TRUE
      GROUP BY p.id
      ORDER BY total_sold DESC, p.created_at DESC
      LIMIT 8
    `);

    // Add default image if no image_url
    const productsWithImages = products.map(product => ({
      ...product,
      imageUrl: product.image_url || 'assets/images/placeholder.jpg',
      primary_image: product.image_url || 'assets/images/placeholder.jpg'
    }));

    res.json(productsWithImages);
  } catch (error) {
    console.error('Get bestseller products error:', error);
    res.status(500).json({ error: 'Failed to fetch bestseller products' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { category_id, brand_id, search } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE p.is_active = TRUE AND p.status != "deleted"';
    let params = [];
    
    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      params.push(category_id);
    }
    
    if (brand_id) {
      whereClause += ' AND p.brand_id = ?';
      params.push(brand_id);
    }
    
    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    const [products] = await pool.execute(`
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        pi.image_url as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    const [totalCount] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `, params);
    
    // Add imageUrl for compatibility
    products.forEach(product => {
      product.imageUrl = product.primary_image || 'assets/images/placeholder.jpg';
    });
    
    res.json({
      products,
      pagination: {
        page: page,
        limit: limit,
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const [categories] = await pool.execute(`
      SELECT 
        c.*,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
      WHERE c.is_active = TRUE
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `);

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/brands', async (req, res) => {
  try {
    const [brands] = await pool.execute(`
      SELECT 
        b.*,
        COUNT(p.id) as product_count
      FROM brands b
      LEFT JOIN products p ON b.id = p.brand_id AND p.is_active = TRUE
      WHERE b.is_active = TRUE
      GROUP BY b.id
      ORDER BY b.name
    `);

    res.json(brands);
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// Admin categories (open - no auth)
app.get('/api/admin/categories-open', async (req, res) => {
  try {
    const [categories] = await pool.execute(`
      SELECT 
        c.*,
        COUNT(p.id) as product_count,
        parent.name as parent_name
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
      LEFT JOIN categories parent ON c.parent_id = parent.id
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `);

    const stats = {
      total: categories.length,
      parents: categories.filter(c => !c.parent_id).length,
      children: categories.filter(c => c.parent_id).length,
      active: categories.filter(c => c.is_active).length
    };

    res.json({ categories, stats });
  } catch (error) {
    console.error('Get admin categories (open) error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Cart API - Simple version
app.get('/api/cart', async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    console.log('Getting cart for user:', userId);

    // Get cart items with product details
    const [cartItems] = await pool.execute(`
      SELECT 
        ci.*,
        p.name as product_name,
        p.price,
        p.sale_price,
        p.is_on_sale,
        pi.image_url as product_image
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE ci.user_id = ?
      ORDER BY ci.created_at DESC
    `, [userId]);

    // Calculate totals
    let subtotal = 0;
    const items = cartItems.map(item => {
      const price = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;
      
      return {
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        price: price,
        quantity: item.quantity,
        image: item.product_image || 'assets/images/placeholder.jpg',
        total: itemTotal
      };
    });

    res.json({
      success: true,
      items: items,
      subtotal: subtotal,
      itemCount: items.reduce((total, item) => total + item.quantity, 0)
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.json({ 
      success: true,
      items: [],
      subtotal: 0,
      itemCount: 0
    });
  }
});

app.post('/api/cart/add', async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const { productId, quantity = 1, variantId = null } = req.body;

    // Check if product exists
    const [products] = await pool.execute(
      'SELECT * FROM products WHERE id = ? AND is_active = TRUE',
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Check if item already exists in cart
    const [existingItems] = await pool.execute(
      'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (existingItems.length > 0) {
      // Update quantity
      await pool.execute(
        'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
        [quantity, existingItems[0].id]
      );
    } else {
      // Add new item
      await pool.execute(
        'INSERT INTO cart_items (user_id, product_id, quantity, variant_id, created_at) VALUES (?, ?, ?, ?, NOW())',
        [userId, productId, quantity, variantId]
      );
    }

    res.json({ 
      success: true, 
      message: 'Item added to cart' 
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add item to cart' 
    });
  }
});

// Update cart item quantity
app.put('/api/cart/update/:itemId', async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    // Update cart item
    const [result] = await pool.execute(
      'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?',
      [quantity, itemId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    res.json({ success: true, message: 'Cart item updated' });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// Remove item from cart
app.delete('/api/cart/remove/:itemId', async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const { itemId } = req.params;

    // Remove cart item
    const [result] = await pool.execute(
      'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
      [itemId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

// Clear cart
app.delete('/api/cart/clear', async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    // Clear all cart items
    await pool.execute(
      'DELETE FROM cart_items WHERE user_id = ?',
      [userId]
    );

    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

// Wishlist API (mock)
// Wishlist APIs
app.get('/api/wishlist', async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    // Get wishlist items with product details
    const [wishlistItems] = await pool.execute(`
      SELECT 
        w.*,
        p.name as product_name,
        p.price,
        p.sale_price,
        p.is_on_sale,
        pi.image_url as product_image
      FROM wishlist w
      LEFT JOIN products p ON w.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `, [userId]);

    const items = wishlistItems.map(item => {
      const price = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
      
      return {
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        price: price,
        image: item.product_image || '/static/products/placeholder.jpg'
      };
    });

    res.json({
      success: true,
      items: items,
      itemCount: items.length
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

app.post('/api/wishlist/add', async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const { productId } = req.body;

    // Check if product exists
    const [products] = await pool.execute(
      'SELECT * FROM products WHERE id = ? AND is_active = TRUE',
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Check if item already exists in wishlist
    const [existingItems] = await pool.execute(
      'SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (existingItems.length > 0) {
      return res.json({ success: true, message: 'Item already in wishlist' });
    }

    // Add new item
    await pool.execute(
      'INSERT INTO wishlist (user_id, product_id, created_at) VALUES (?, ?, NOW())',
      [userId, productId]
    );

    res.json({ success: true, message: 'Item added to wishlist' });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

app.delete('/api/wishlist/remove', async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const { productId } = req.body;

    // Remove item from wishlist
    const [result] = await pool.execute(
      'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found in wishlist' });
    }

    res.json({ success: true, message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

// Clear wishlist
app.delete('/api/wishlist/clear', async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    // Clear all wishlist items
    await pool.execute(
      'DELETE FROM wishlist WHERE user_id = ?',
      [userId]
    );

    res.json({ success: true, message: 'Wishlist cleared' });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({ error: 'Failed to clear wishlist' });
  }
});


app.post('/api/user/addresses', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone, address, province, district, ward, is_default } = req.body;

    // Validate required fields
    if (!full_name || !phone || !address || !province || !district || !ward) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // If this is set as default, unset other defaults
    if (is_default) {
      await pool.execute(
        'UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?',
        [userId]
      );
    }

    const [result] = await pool.execute(
      'INSERT INTO user_addresses (user_id, type, recipient_name, phone, address_line1, city, state, postal_code, country, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, 'home', full_name, phone, address, province, district, ward, 'Vietnam', Boolean(is_default)]
    );

    res.json({
      success: true,
      message: 'Address saved successfully',
      addressId: result.insertId
    });
  } catch (error) {
    console.error('Save address error:', error);
    res.status(500).json({ error: 'Failed to save address' });
  }
});

app.delete('/api/user/addresses/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;

    const [result] = await pool.execute(
      'DELETE FROM user_addresses WHERE id = ? AND user_id = ?',
      [addressId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

// Orders routes
app.post('/api/orders', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, address_id, payment_method, notes } = req.body;

    // Calculate totals
    const subtotal = items.reduce((total, item) => total + item.total, 0);
    const shipping_fee = subtotal > 500000 ? 0 : 30000;
    const tax = subtotal * 0.1;
    const total = subtotal + shipping_fee + tax;

    // Get address details for shipping address
    const [addresses] = await pool.execute(
      'SELECT * FROM user_addresses WHERE id = ? AND user_id = ?',
      [address_id, userId]
    );

    if (addresses.length === 0) {
      return res.status(400).json({ error: 'Address not found' });
    }

    const address = addresses[0];
    const shippingAddressObj = {
      recipientName: address.recipient_name,
      phone: address.phone,
      addressLine1: address.address_line1,
      addressLine2: address.address_line2 || null,
      city: address.city,
      state: address.state,
      postalCode: address.postal_code,
      country: address.country || 'Vietnam'
    };
    const order_number = `ORD-${Date.now()}-${userId}`;

    // Create order with minimal required fields
    const [orderResult] = await pool.execute(
      'INSERT INTO orders (order_number, user_id, subtotal, total_amount, shipping_address, payment_method) VALUES (?, ?, ?, ?, ?, ?)',
      [order_number, userId, subtotal, total, JSON.stringify(shippingAddressObj), payment_method || 'COD']
    );

    const orderId = orderResult.insertId;

    // Create order items
    for (const item of items) {
      await pool.execute(
        'INSERT INTO order_items (order_id, product_id, variant_id, product_name, product_sku, variant_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [orderId, item.productId, item.variantId || null, item.productName || 'Unknown Product', item.sku || 'N/A', item.variantName || null, item.quantity, item.price, item.total]
      );
    }

    // Clear user's cart on successful order creation
    await pool.execute('DELETE FROM cart_items WHERE user_id = ?', [userId]);

    res.json({
      success: true,
      message: 'Order created successfully',
      orderId: orderId
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/orders', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [orders] = await pool.execute(`
      SELECT o.*
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      orders: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order with items
app.get('/api/orders/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.id;

    // Get order
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ? LIMIT 1',
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];
    // Parse shipping address JSON if string
    let shippingAddress = null;
    try {
      shippingAddress = typeof order.shipping_address === 'string'
        ? JSON.parse(order.shipping_address)
        : order.shipping_address;
    } catch (_) {
      shippingAddress = null;
    }

    // Get items
    const [items] = await pool.execute(`
      SELECT oi.*, 
             COALESCE(pi.image_url, 'assets/images/placeholder.jpg') AS image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `, [orderId]);

    res.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status || 'pending',
        payment_method: order.payment_method || 'COD',
        subtotal: order.subtotal,
        tax_amount: order.tax_amount || 0,
        shipping_amount: order.shipping_amount || 0,
        total_amount: order.total_amount,
        created_at: order.created_at,
        shipping_address: shippingAddress,
        items: items
      }
    });
  } catch (error) {
    console.error('Get order detail error:', error);
    res.status(500).json({ error: 'Failed to fetch order detail' });
  }
});

// Admin: list orders
app.get('/api/admin/orders', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status } = req.query;
    console.log('📋 Admin requesting orders with status filter:', status);
    
    let where = 'WHERE 1=1';
    const params = [];
    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }

    const [orders] = await pool.execute(`
      SELECT o.*, u.email, u.first_name, u.last_name, u.phone
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ${where}
      ORDER BY o.created_at DESC
    `, params);

    console.log('📦 Found orders:', orders.length);
    orders.forEach(order => {
      console.log(`  - Order #${order.id}: status="${order.status}", email="${order.email}"`);
    });

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Admin list orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Admin: order detail with user and items
app.get('/api/admin/orders/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const orderId = req.params.id;
    const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orders[0];

    const [userRows] = await pool.execute('SELECT id, email, first_name, last_name, phone FROM users WHERE id = ? LIMIT 1', [order.user_id]);
    const user = userRows[0] || null;

    let shippingAddress = null;
    try { shippingAddress = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address; } catch (_) {}

    const [items] = await pool.execute(`
      SELECT oi.*, COALESCE(pi.image_url, '/static/products/placeholder.jpg') AS image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE oi.order_id = ? ORDER BY oi.id ASC
    `, [orderId]);

    res.json({ success: true, order: { ...order, shipping_address: shippingAddress }, user, items });
  } catch (error) {
    console.error('Admin get order detail error:', error);
    res.status(500).json({ error: 'Failed to fetch order detail' });
  }
});

// Admin: update order status
app.put('/api/admin/orders/:id/status', verifyToken, async (req, res) => {
  try {
    console.log('🔄 Admin updating order status:', req.params.id, req.body);
    console.log('🔍 User info:', req.user);
    
    if (req.user.role !== 'admin') {
      console.log('❌ User is not admin:', req.user.role);
      return res.status(403).json({ error: 'Admin access required' });
    }

    const orderId = req.params.id;
    const { status } = req.body; // 'pending' | 'confirmed' | 'delivering' | 'delivered' | 'completed' | 'cancelled'

    console.log(`📝 Updating order #${orderId} to status: ${status}`);

    // Allow new statuses: pending, confirmed, delivering, delivered, completed, cancelled
    const validStatuses = ['pending', 'confirmed', 'delivering', 'delivered', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      console.log('❌ Invalid status:', status, 'Valid statuses:', validStatuses);
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get order details before updating
    const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orders[0];

    // Get user details
    const [userRows] = await pool.execute('SELECT id, email, first_name, last_name, phone FROM users WHERE id = ? LIMIT 1', [order.user_id]);
    const user = userRows[0] || null;

    // Get order items
    const [items] = await pool.execute(`
      SELECT oi.*, p.name as product_name, COALESCE(pi.image_url, '/static/products/placeholder.jpg') AS image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE oi.order_id = ? ORDER BY oi.id ASC
    `, [orderId]);

    // Update order status
    const [result] = await pool.execute(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, orderId]
    );

    console.log('📊 Update result:', result);

    if (result.affectedRows === 0) {
      console.log('❌ Order not found:', orderId);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Send email notification
    if (user && user.email) {
      try {
        const orderData = {
          order: order,
          user: user,
          items: items
        };
        
        await sendOrderNotificationEmail(user.email, orderData, status);
        console.log(`📧 Email notification sent to ${user.email} for order #${orderId}`);
      } catch (emailError) {
        console.error('❌ Error sending email notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    console.log(`✅ Order #${orderId} status updated to: ${status}`);
    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    console.error('❌ Admin update order status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Create order
app.post('/api/orders', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingAddress, billingAddress, paymentMethod, notes } = req.body;

    console.log('🛒 Creating order for user:', userId);

    // Get cart items
    const [cartItems] = await pool.execute(`
      SELECT 
        ci.*,
        p.name as product_name,
        p.price as product_price,
        p.sale_price,
        p.is_on_sale,
        COALESCE(pi.image_url, '/static/products/placeholder.jpg') as image_url
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE ci.user_id = ? AND p.is_active = TRUE
    `, [userId]);

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Empty cart' });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = cartItems.map(item => {
      const price = item.sale_price || item.product_price;
      const total = price * item.quantity;
      subtotal += total;

      return {
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: price,
        total_price: total,
        image_url: item.image_url
      };
    });

    const shipping = subtotal > 500000 ? 0 : 30000; // Free shipping over 500k
    const tax = subtotal * 0.1; // 10% tax
    const totalAmount = subtotal + shipping + tax;

    // Create order
    const orderNumber = `EASY${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const [orderResult] = await pool.execute(`
      INSERT INTO orders (user_id, order_number, status, payment_status, subtotal, shipping_cost, tax_amount, total_amount, shipping_address, billing_address, payment_method, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      userId, orderNumber, 'pending', 'pending', subtotal, shipping, tax, totalAmount,
      JSON.stringify(shippingAddress), JSON.stringify(billingAddress), paymentMethod, notes || null
    ]);

    const orderId = orderResult.insertId;

    // Create order items
    for (const item of orderItems) {
      await pool.execute(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [orderId, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price]);
    }

    // Clear cart
    await pool.execute('DELETE FROM cart_items WHERE user_id = ?', [userId]);

    // Get user details for email
    const [userRows] = await pool.execute('SELECT id, email, first_name, last_name FROM users WHERE id = ?', [userId]);
    const user = userRows[0];

    // Send order confirmation email
    if (user && user.email) {
      try {
        const orderData = {
          order: {
            id: orderId,
            order_number: orderNumber,
            status: 'pending',
            total_amount: totalAmount,
            created_at: new Date()
          },
          user: user,
          items: orderItems
        };
        
        await sendOrderNotificationEmail(user.email, orderData, 'pending');
        console.log(`📧 Order confirmation email sent to ${user.email} for order #${orderId}`);
      } catch (emailError) {
        console.error('❌ Error sending order confirmation email:', emailError);
      }
    }

    console.log(`✅ Order #${orderId} created successfully`);
    res.json({ 
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
    console.error('❌ Create order error:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

// ===== REVIEW & COMMENT SYSTEM =====

// Get product reviews
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const productId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [reviews] = await pool.execute(`
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.email
      FROM product_reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ? AND r.is_approved = TRUE
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [productId, limit, offset]);

    const [totalCount] = await pool.execute(
      'SELECT COUNT(*) as total FROM product_reviews WHERE product_id = ? AND is_approved = TRUE',
      [productId]
    );

    res.json({
      success: true,
      reviews,
      pagination: {
        page,
        limit,
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Add product review
app.post('/api/products/:id/reviews', verifyToken, async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user.id;
    const { rating, comment } = req.body;

    // Check if user has completed orders for this product
    const [completedOrders] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'completed'
    `, [userId, productId]);

    if (completedOrders[0].count === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'You can only review products you have purchased and received' 
      });
    }

    // Check if user already reviewed this product
    const [existingReview] = await pool.execute(
      'SELECT id FROM product_reviews WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (existingReview.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'You have already reviewed this product' 
      });
    }

    // Add review
    const [result] = await pool.execute(`
      INSERT INTO product_reviews (product_id, user_id, rating, comment, is_approved, created_at)
      VALUES (?, ?, ?, ?, FALSE, NOW())
    `, [productId, userId, rating, comment]);

    res.json({
      success: true,
      message: 'Review submitted successfully. It will be reviewed before being published.',
      reviewId: result.insertId
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// Admin: Get all reviews (pending approval)
app.get('/api/admin/reviews', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'all'; // all, pending, approved, rejected

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (status === 'pending') {
      whereClause += ' AND r.is_approved = FALSE AND r.is_rejected = FALSE';
    } else if (status === 'approved') {
      whereClause += ' AND r.is_approved = TRUE';
    } else if (status === 'rejected') {
      whereClause += ' AND r.is_rejected = TRUE';
    }

    const [reviews] = await pool.execute(`
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.email,
        p.name as product_name
      FROM product_reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const [totalCount] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM product_reviews r
      ${whereClause}
    `, params);

    res.json({
      success: true,
      reviews,
      pagination: {
        page,
        limit,
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Admin: Approve/Reject review
app.put('/api/admin/reviews/:id/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const reviewId = req.params.id;
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const [result] = await pool.execute(`
      UPDATE product_reviews 
      SET is_approved = ?, is_rejected = ?, updated_at = NOW()
      WHERE id = ?
    `, [action === 'approve', action === 'reject', reviewId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({
      success: true,
      message: `Review ${action}d successfully`
    });
  } catch (error) {
    console.error('Update review status error:', error);
    res.status(500).json({ error: 'Failed to update review status' });
  }
});

// Admin: Delete review
app.delete('/api/admin/reviews/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const reviewId = req.params.id;

    const [result] = await pool.execute(
      'DELETE FROM product_reviews WHERE id = ?',
      [reviewId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// ===== VOUCHER SYSTEM =====

// Get all vouchers (public)
app.get('/api/vouchers', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [vouchers] = await pool.execute(`
      SELECT 
        v.*,
        COUNT(uv.id) as usage_count
      FROM vouchers v
      LEFT JOIN user_vouchers uv ON v.id = uv.voucher_id
      WHERE v.is_active = TRUE AND v.expires_at > NOW()
      GROUP BY v.id
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [totalCount] = await pool.execute(
      'SELECT COUNT(*) as total FROM vouchers WHERE is_active = TRUE AND expires_at > NOW()'
    );

    res.json({
      success: true,
      vouchers,
      pagination: {
        page,
        limit,
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get vouchers error:', error);
    res.status(500).json({ error: 'Failed to fetch vouchers' });
  }
});

// Get user's vouchers
app.get('/api/user/vouchers', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [userVouchers] = await pool.execute(`
      SELECT 
        uv.*,
        v.code,
        v.name,
        v.description,
        v.discount_type,
        v.discount_value,
        v.minimum_amount,
        v.maximum_discount,
        v.expires_at,
        v.is_active
      FROM user_vouchers uv
      JOIN vouchers v ON uv.voucher_id = v.id
      WHERE uv.user_id = ? AND uv.is_used = FALSE AND v.expires_at > NOW() AND v.is_active = TRUE
      ORDER BY uv.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      vouchers: userVouchers
    });
  } catch (error) {
    console.error('Get user vouchers error:', error);
    res.status(500).json({ error: 'Failed to fetch user vouchers' });
  }
});

// Claim voucher
app.post('/api/vouchers/:id/claim', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const voucherId = req.params.id;

    // Check if voucher exists and is active
    const [vouchers] = await pool.execute(`
      SELECT * FROM vouchers 
      WHERE id = ? AND is_active = TRUE AND expires_at > NOW()
    `, [voucherId]);

    if (vouchers.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Voucher not found or expired' 
      });
    }

    const voucher = vouchers[0];

    // Check if user already claimed this voucher
    const [existingClaim] = await pool.execute(
      'SELECT id FROM user_vouchers WHERE user_id = ? AND voucher_id = ?',
      [userId, voucherId]
    );

    if (existingClaim.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'You have already claimed this voucher' 
      });
    }

    // Check if voucher has remaining quantity
    const [usageCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_vouchers WHERE voucher_id = ?',
      [voucherId]
    );

    if (voucher.quantity_limit && usageCount[0].count >= voucher.quantity_limit) {
      return res.status(400).json({ 
        success: false, 
        error: 'Voucher is out of stock' 
      });
    }

    // Claim voucher
    const [result] = await pool.execute(`
      INSERT INTO user_vouchers (user_id, voucher_id, created_at)
      VALUES (?, ?, NOW())
    `, [userId, voucherId]);

    res.json({
      success: true,
      message: 'Voucher claimed successfully',
      userVoucherId: result.insertId
    });
  } catch (error) {
    console.error('Claim voucher error:', error);
    res.status(500).json({ error: 'Failed to claim voucher' });
  }
});

// Admin: Create voucher
app.post('/api/admin/vouchers', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { 
      name, 
      description, 
      code, 
      discount_type, 
      discount_value, 
      minimum_amount, 
      maximum_discount, 
      quantity_limit, 
      expires_at 
    } = req.body;

    // Validate required fields
    if (!name || !code || !discount_type || !discount_value) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if code already exists
    const [existingCode] = await pool.execute(
      'SELECT id FROM vouchers WHERE code = ?',
      [code]
    );

    if (existingCode.length > 0) {
      return res.status(400).json({ error: 'Voucher code already exists' });
    }

    // Create voucher
    const [result] = await pool.execute(`
      INSERT INTO vouchers (
        name, description, code, discount_type, discount_value, 
        minimum_amount, maximum_discount, quantity_limit, expires_at, 
        is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
    `, [
      name, description, code, discount_type, discount_value,
      minimum_amount, maximum_discount, quantity_limit, expires_at
    ]);

    res.json({
      success: true,
      message: 'Voucher created successfully',
      voucherId: result.insertId
    });
  } catch (error) {
    console.error('Create voucher error:', error);
    res.status(500).json({ error: 'Failed to create voucher' });
  }
});

// Admin: Get all vouchers
app.get('/api/admin/vouchers', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [vouchers] = await pool.execute(`
      SELECT 
        v.*,
        COUNT(uv.id) as usage_count
      FROM vouchers v
      LEFT JOIN user_vouchers uv ON v.id = uv.voucher_id
      GROUP BY v.id
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [totalCount] = await pool.execute('SELECT COUNT(*) as total FROM vouchers');

    res.json({
      success: true,
      vouchers,
      pagination: {
        page,
        limit,
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin vouchers error:', error);
    res.status(500).json({ error: 'Failed to fetch vouchers' });
  }
});

// Admin: Update voucher
app.put('/api/admin/vouchers/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const voucherId = req.params.id;
    const { 
      name, 
      description, 
      discount_type, 
      discount_value, 
      minimum_amount, 
      maximum_discount, 
      quantity_limit, 
      expires_at, 
      is_active 
    } = req.body;

    const [result] = await pool.execute(`
      UPDATE vouchers SET 
        name = ?, description = ?, discount_type = ?, discount_value = ?,
        minimum_amount = ?, maximum_discount = ?, quantity_limit = ?,
        expires_at = ?, is_active = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      name, description, discount_type, discount_value,
      minimum_amount, maximum_discount, quantity_limit,
      expires_at, is_active, voucherId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    res.json({
      success: true,
      message: 'Voucher updated successfully'
    });
  } catch (error) {
    console.error('Update voucher error:', error);
    res.status(500).json({ error: 'Failed to update voucher' });
  }
});

// Admin: Delete voucher
app.delete('/api/admin/vouchers/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const voucherId = req.params.id;

    const [result] = await pool.execute(
      'DELETE FROM vouchers WHERE id = ?',
      [voucherId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    res.json({
      success: true,
      message: 'Voucher deleted successfully'
    });
  } catch (error) {
    console.error('Delete voucher error:', error);
    res.status(500).json({ error: 'Failed to delete voucher' });
  }
});

// ===== USER ORDERS =====

// Get user orders
app.get('/api/user/orders', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'all';

    let whereClause = 'WHERE o.user_id = ?';
    let params = [userId];

    if (status !== 'all') {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    const [orders] = await pool.execute(`
      SELECT 
        o.*,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get order items for each order
    for (let order of orders) {
      const [items] = await pool.execute(`
        SELECT 
          oi.*,
          COALESCE(pi.image_url, '/static/products/placeholder.jpg') as image_url
        FROM order_items oi
        LEFT JOIN product_images pi ON oi.product_id = pi.product_id AND pi.is_primary = TRUE
        WHERE oi.order_id = ?
        ORDER BY oi.id ASC
      `, [order.id]);
      
      order.items = items;
    }

    const [totalCount] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM orders o
      ${whereClause}
    `, params);

    res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order detail
app.get('/api/user/orders/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.id;

    const [orders] = await pool.execute(`
      SELECT * FROM orders 
      WHERE id = ? AND user_id = ?
    `, [orderId, userId]);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Get order items
    const [items] = await pool.execute(`
      SELECT 
        oi.*,
        COALESCE(pi.image_url, '/static/products/placeholder.jpg') as image_url
      FROM order_items oi
      LEFT JOIN product_images pi ON oi.product_id = pi.product_id AND pi.is_primary = TRUE
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `, [orderId]);

    // Parse addresses
    let shippingAddress = null;
    let billingAddress = null;
    
    try {
      shippingAddress = typeof order.shipping_address === 'string' 
        ? JSON.parse(order.shipping_address) 
        : order.shipping_address;
    } catch (e) {
      console.error('Error parsing shipping address:', e);
    }
    
    try {
      billingAddress = typeof order.billing_address === 'string' 
        ? JSON.parse(order.billing_address) 
        : order.billing_address;
    } catch (e) {
      console.error('Error parsing billing address:', e);
    }

    res.json({
      success: true,
      order: {
        ...order,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        items
      }
    });
  } catch (error) {
    console.error('Get order detail error:', error);
    res.status(500).json({ error: 'Failed to fetch order detail' });
  }
});

// Cancel order
app.put('/api/user/orders/:id/cancel', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.id;

    // Check if order exists and belongs to user
    const [orders] = await pool.execute(`
      SELECT * FROM orders 
      WHERE id = ? AND user_id = ? AND status = 'pending'
    `, [orderId, userId]);

    if (orders.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found or cannot be cancelled' 
      });
    }

    // Update order status
    await pool.execute(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      ['cancelled', orderId]
    );

    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// ===== NOTIFICATION SYSTEM =====

// Get user notifications
app.get('/api/user/notifications', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [notifications] = await pool.execute(`
      SELECT 
        n.*,
        CASE 
          WHEN n.type = 'order' THEN CONCAT('Đơn hàng #', o.order_number, ' đã ', 
            CASE o.status
              WHEN 'confirmed' THEN 'được xác nhận'
              WHEN 'delivering' THEN 'đang được giao'
              WHEN 'delivered' THEN 'đã giao thành công'
              WHEN 'completed' THEN 'hoàn tất'
              WHEN 'cancelled' THEN 'bị hủy'
              ELSE 'cập nhật trạng thái'
            END
          )
          WHEN n.type = 'voucher' THEN CONCAT('Voucher "', v.name, '" sắp hết hạn')
          WHEN n.type = 'review' THEN 'Bạn có thể đánh giá sản phẩm đã mua'
          ELSE n.message
        END as display_message
      FROM notifications n
      LEFT JOIN orders o ON n.reference_id = o.id AND n.type = 'order'
      LEFT JOIN vouchers v ON n.reference_id = v.id AND n.type = 'voucher'
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    const [totalCount] = await pool.execute(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
      [userId]
    );

    const [unreadCount] = await pool.execute(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    res.json({
      success: true,
      notifications,
      unreadCount: unreadCount[0].total,
      pagination: {
        page,
        limit,
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
app.put('/api/user/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const [result] = await pool.execute(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
app.put('/api/user/notifications/read-all', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.execute(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
app.delete('/api/user/notifications/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const [result] = await pool.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Helper function to create notification
const createNotification = async (userId, type, message, referenceId = null) => {
  try {
    await pool.execute(`
      INSERT INTO notifications (user_id, type, message, reference_id, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, [userId, type, message, referenceId]);
    
    console.log(`✅ Notification created for user ${userId}: ${message}`);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// ===== MESSAGING SYSTEM =====

// Get conversations for user
app.get('/api/user/conversations', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [conversations] = await pool.execute(`
      SELECT 
        c.*,
        CASE 
          WHEN c.user_id = ? THEN 'admin'
          ELSE u.first_name
        END as other_party_name,
        CASE 
          WHEN c.user_id = ? THEN u.email
          ELSE 'admin@easybuy.com'
        END as other_party_email,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = FALSE) as unread_count,
        (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
        (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_time
      FROM conversations c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.user_id = ? OR c.admin_id IS NOT NULL
      ORDER BY c.updated_at DESC
    `, [userId, userId, userId, userId]);

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages for conversation
app.get('/api/user/conversations/:id/messages', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Check if user has access to this conversation
    const [conversations] = await pool.execute(`
      SELECT * FROM conversations 
      WHERE id = ? AND (user_id = ? OR admin_id IS NOT NULL)
    `, [conversationId, userId]);

    if (conversations.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const [messages] = await pool.execute(`
      SELECT 
        m.*,
        u.first_name,
        u.last_name,
        u.email
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
      LIMIT ? OFFSET ?
    `, [conversationId, limit, offset]);

    // Mark messages as read
    await pool.execute(`
      UPDATE messages 
      SET is_read = TRUE, read_at = NOW() 
      WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE
    `, [conversationId, userId]);

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
app.post('/api/user/conversations/:id/messages', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const { content, message_type = 'text' } = req.body;

    // Check if user has access to this conversation
    const [conversations] = await pool.execute(`
      SELECT * FROM conversations 
      WHERE id = ? AND (user_id = ? OR admin_id IS NOT NULL)
    `, [conversationId, userId]);

    if (conversations.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Create message
    const [result] = await pool.execute(`
      INSERT INTO messages (conversation_id, sender_id, content, message_type, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, [conversationId, userId, content, message_type]);

    // Update conversation
    await pool.execute(`
      UPDATE conversations 
      SET updated_at = NOW() 
      WHERE id = ?
    `, [conversationId]);

    res.json({
      success: true,
      message: 'Message sent successfully',
      messageId: result.insertId
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Start new conversation
app.post('/api/user/conversations', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject, initial_message } = req.body;

    // Create conversation
    const [result] = await pool.execute(`
      INSERT INTO conversations (user_id, subject, status, created_at, updated_at)
      VALUES (?, ?, 'open', NOW(), NOW())
    `, [userId, subject]);

    const conversationId = result.insertId;

    // Add initial message if provided
    if (initial_message) {
      await pool.execute(`
        INSERT INTO messages (conversation_id, sender_id, content, message_type, created_at)
        VALUES (?, ?, ?, 'text', NOW())
      `, [conversationId, userId, initial_message]);
    }

    res.json({
      success: true,
      message: 'Conversation started successfully',
      conversationId
    });
  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// Admin: Get all conversations
app.get('/api/admin/conversations', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'all';

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (status !== 'all') {
      whereClause += ' AND c.status = ?';
      params.push(status);
    }

    const [conversations] = await pool.execute(`
      SELECT 
        c.*,
        u.first_name,
        u.last_name,
        u.email,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = FALSE) as unread_count,
        (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
        (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_time
      FROM conversations c
      LEFT JOIN users u ON c.user_id = u.id
      ${whereClause}
      ORDER BY c.updated_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, ...params, limit, offset]);

    const [totalCount] = await pool.execute(`
      SELECT COUNT(*) as total FROM conversations c ${whereClause}
    `, params);

    res.json({
      success: true,
      conversations,
      pagination: {
        page,
        limit,
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Admin: Update conversation status
app.put('/api/admin/conversations/:id/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const conversationId = req.params.id;
    const { status } = req.body;

    if (!['open', 'closed', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [result] = await pool.execute(`
      UPDATE conversations 
      SET status = ?, updated_at = NOW() 
      WHERE id = ?
    `, [status, conversationId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      success: true,
      message: 'Conversation status updated'
    });
  } catch (error) {
    console.error('Update conversation status error:', error);
    res.status(500).json({ error: 'Failed to update conversation status' });
  }
});

// Test endpoint without authentication (temporary)
app.put('/api/test/orders/:id/status', async (req, res) => {
  try {
    console.log('🧪 TEST: Updating order status:', req.params.id, req.body);
    
    const orderId = req.params.id;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'delivering', 'delivered', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [result] = await pool.execute(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log(`✅ TEST: Order #${orderId} status updated to: ${status}`);
    res.json({ success: true, message: 'Order status updated (TEST)' });
  } catch (error) {
    console.error('❌ TEST: Update order status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Test authentication endpoint
app.get('/api/test/auth', verifyToken, async (req, res) => {
  console.log('🔍 Test auth - User info:', req.user);
  res.json({ 
    success: true, 
    user: req.user,
    message: 'Authentication working' 
  });
});

// Admin: cancel order
app.post('/api/admin/orders/:id/cancel', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const orderId = req.params.id;
    const { reason } = req.body || {};

    // Get current status
    const [rows] = await pool.execute('SELECT status FROM orders WHERE id = ? LIMIT 1', [orderId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const status = rows[0].status || 'pending';
    if (status === 'delivered') {
      return res.status(400).json({ success: false, error: 'Cannot cancel order at this stage' });
    }
    if (status === 'cancelled') {
      return res.json({ success: true, message: 'Order already cancelled' });
    }

    await pool.execute(
      `UPDATE orders 
       SET status = 'cancelled', 
           updated_at = NOW(), 
           notes = CONCAT(IFNULL(notes,''), ?) 
       WHERE id = ?`,
      [reason ? `\n[${new Date().toISOString()}] Admin cancelled: ${reason}` : `\n[${new Date().toISOString()}] Admin cancelled`, orderId]
    );

    res.json({ success: true, message: 'Order cancelled by admin' });
  } catch (error) {
    console.error('Admin cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Admin: delete order
app.delete('/api/admin/orders/:id', verifyToken, async (req, res) => {
  try {
    console.log('🗑️ Admin deleting order:', req.params.id);
    console.log('🔍 User info:', req.user);
    
    if (req.user.role !== 'admin') {
      console.log('❌ User is not admin:', req.user.role);
      return res.status(403).json({ error: 'Admin access required' });
    }

    const orderId = req.params.id;

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check if order exists
      const [orderCheck] = await connection.execute('SELECT id, status FROM orders WHERE id = ?', [orderId]);
      if (orderCheck.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Order not found' });
      }

      const orderStatus = orderCheck[0].status;
      console.log('📋 Order found, status:', orderStatus);

      // Check if order can be deleted (only pending or cancelled orders)
      if (orderStatus === 'delivered' || orderStatus === 'completed') {
        await connection.rollback();
        return res.status(400).json({ 
          error: 'Cannot delete delivered or completed orders',
          currentStatus: orderStatus 
        });
      }

      console.log('🗑️ Order can be deleted, proceeding...');

      // Delete order items first
      await connection.execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);
      console.log('📦 Order items deleted');

      // Delete the order
      const [result] = await connection.execute('DELETE FROM orders WHERE id = ?', [orderId]);
      console.log('✅ Order deleted successfully');

      await connection.commit();
      res.json({ 
        message: 'Order deleted successfully', 
        orderId: orderId,
        deletedStatus: orderStatus 
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('❌ Admin delete order error:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// User: cancel pending order
app.post('/api/orders/:id/cancel', verifyToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;

    console.log('🔄 Customer cancelling order:', orderId, 'User:', userId, 'Reason:', reason);

    const [orders] = await pool.execute(
      'SELECT id, status FROM orders WHERE id = ? AND user_id = ? LIMIT 1',
      [orderId, userId]
    );
    
    console.log('📋 Found orders:', orders);
    
    if (orders.length === 0) {
      console.log('❌ Order not found or not owned by user');
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (orders[0].status !== 'pending') {
      console.log('❌ Order status is not pending:', orders[0].status);
      return res.status(400).json({ error: 'Cannot cancel after shop confirms' });
    }

    const [result] = await pool.execute('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', ['cancelled', orderId]);
    console.log('📊 Update result:', result);
    
    console.log('✅ Order cancelled successfully');
    res.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    console.error('❌ Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// User: confirm received
app.post('/api/orders/:id/confirm-received', verifyToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    const [orders] = await pool.execute(
      'SELECT id, status FROM orders WHERE id = ? AND user_id = ? LIMIT 1',
      [orderId, userId]
    );
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (orders[0].status !== 'shipping') return res.status(400).json({ error: 'Order is not in shipping state' });

    await pool.execute('UPDATE orders SET status = ?, delivered_at = NOW() WHERE id = ?', ['delivered', orderId]);
    res.json({ success: true, message: 'Order marked as delivered' });
  } catch (error) {
    console.error('Confirm received error:', error);
    res.status(500).json({ error: 'Failed to confirm received' });
  }
});

// Reviews: create review (only for delivered orders and purchased product)
app.post('/api/reviews', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { order_id, product_id, rating, comment } = req.body;

    if (!order_id || !product_id || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check order delivered and product belongs to order
    const [rows] = await pool.execute(`
      SELECT o.id FROM orders o
      JOIN order_items oi ON o.id = oi.order_id AND oi.product_id = ?
      WHERE o.id = ? AND o.user_id = ? AND o.status = 'delivered' LIMIT 1
    `, [product_id, order_id, userId]);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'You can only review delivered purchases' });
    }

    await pool.execute(
      'INSERT INTO product_reviews (user_id, product_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [userId, product_id, order_id, Math.max(1, Math.min(5, parseInt(rating))), comment || null]
    );

    res.json({ success: true, message: 'Review submitted' });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Reviews: list by product
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const productId = req.params.id;
    const [reviews] = await pool.execute(`
      SELECT r.*, u.first_name, u.last_name FROM product_reviews r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.product_id = ? ORDER BY r.created_at DESC
    `, [productId]);
    res.json({ success: true, reviews });
  } catch (error) {
    console.error('List reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// User profile routes
app.get('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await pool.execute(
      'SELECT id, email, first_name, last_name, phone, date_of_birth, gender, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    res.json({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      date_of_birth: user.date_of_birth,
      gender: user.gender,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phone, dateOfBirth, gender } = req.body;

    await pool.execute(`
      UPDATE users 
      SET first_name = ?, last_name = ?, phone = ?, date_of_birth = ?, gender = ?, updated_at = NOW()
      WHERE id = ?
    `, [firstName, lastName, phone, dateOfBirth, gender, userId]);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password API
app.post('/api/user/change-password', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get current user password hash
    const [users] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, userId]
    );

    res.json({ 
      success: true,
      message: 'Password changed successfully' 
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Forgot password API - sử dụng lại logic OTP đã có
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, first_name FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Email không tồn tại trong hệ thống' });
    }

    const user = users[0];

    // Generate OTP (sử dụng logic đã có)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in otp_verifications table (sử dụng lại table đã có)
    await pool.execute(
      'INSERT INTO otp_verifications (email, otp_code, type, expires_at) VALUES (?, ?, ?, ?)',
      [email, otp, 'password_reset', expiresAt]
    );

    console.log(`📧 OTP for ${email}: ${otp}`);
    
    // Sử dụng lại hàm sendOTPEmail đã có
    const emailSent = await sendOTPEmail(email, otp, 'password_reset');
    
    if (emailSent) {
      res.json({
        success: true,
        message: 'Mã OTP đã được gửi đến email của bạn',
        otp: otp // For testing
      });
    } else {
      res.status(500).json({ error: 'Failed to send OTP email' });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Reset password API
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    // Verify OTP (sử dụng lại table otp_verifications)
    const [otpResults] = await pool.execute(
      'SELECT * FROM otp_verifications WHERE email = ? AND otp_code = ? AND type = ? AND is_used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, otp, 'password_reset']
    );

    if (otpResults.length === 0) {
      return res.status(400).json({ error: 'Mã OTP không hợp lệ hoặc đã hết hạn' });
    }

    // Mark OTP as used
    await pool.execute(
      'UPDATE otp_verifications SET is_used = TRUE WHERE id = ?',
      [otpResults[0].id]
    );

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE email = ?',
      [hashedPassword, email]
    );

    res.json({
      success: true,
      message: 'Mật khẩu đã được đặt lại thành công'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to reset password', details: error.message });
  }
});

// User addresses routes
app.get('/api/user/addresses', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [addresses] = await pool.execute(
      'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [userId]
    );

    // Transform addresses to match frontend format
    const transformedAddresses = addresses.map(addr => ({
      id: addr.id,
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      address_line1: addr.address_line1,
      address_line2: addr.address_line2,
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      is_default: Boolean(addr.is_default)
    }));

    res.json({ addresses: transformedAddresses });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});


app.put('/api/user/addresses/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;
    const { 
      type, recipientName, phone, addressLine1, addressLine2, 
      city, state, postalCode, country, isDefault 
    } = req.body;

    // Check if address belongs to user
    const [existing] = await pool.execute(
      'SELECT id FROM user_addresses WHERE id = ? AND user_id = ?',
      [addressId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await pool.execute(
        'UPDATE user_addresses SET is_default = FALSE WHERE user_id = ? AND id != ?',
        [userId, addressId]
      );
    }

    await pool.execute(`
      UPDATE user_addresses 
      SET type = ?, recipient_name = ?, phone = ?, address_line1 = ?, address_line2 = ?,
          city = ?, state = ?, postal_code = ?, country = ?, is_default = ?, updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `, [type, recipientName, phone, addressLine1, addressLine2, 
        city, state, postalCode, country, isDefault, addressId, userId]);

    res.json({ message: 'Address updated successfully' });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

app.delete('/api/user/addresses/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;

    const [result] = await pool.execute(
      'DELETE FROM user_addresses WHERE id = ? AND user_id = ?',
      [addressId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

// Test endpoint for products (no auth)
app.get('/api/admin/products-test', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    console.log('Products test params:', { page, limit, offset });

    const [products] = await pool.query(`
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        pi.image_url as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.json({ success: true, products, count: products.length });
  } catch (error) {
    console.error('Products test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Products API
app.get('/api/admin/products', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const { search, category_id, brand_id, status, featured } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (brand_id) {
      whereClause += ' AND p.brand_id = ?';
      params.push(brand_id);
    }

    if (status === 'active') {
      whereClause += ' AND p.is_active = TRUE';
    } else if (status === 'inactive') {
      whereClause += ' AND p.is_active = FALSE';
    }

    if (featured === 'true') {
      whereClause += ' AND p.is_featured = TRUE';
    } else if (featured === 'false') {
      whereClause += ' AND p.is_featured = FALSE';
    }

    // Get products with images
    const [products] = await pool.execute(`
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        pi.image_url as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `, params);

    // Get statistics
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new,
        COUNT(CASE WHEN p.is_active = TRUE THEN 1 END) as active,
        COUNT(CASE WHEN p.is_featured = TRUE THEN 1 END) as featured
      FROM products p
    `);

    res.json({
      products: products.map(product => ({
        ...product,
        stock: product.stock_quantity,
        is_best_seller: false // Add this field for compatibility
      })),
      stats: stats[0],
      pagination: {
        page: page,
        limit: limit,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Admin products open endpoint (for demo/testing)
app.get('/api/admin/products-open', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const { search, category_id, brand_id, status, featured } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (brand_id) {
      whereClause += ' AND p.brand_id = ?';
      params.push(brand_id);
    }

    if (status === 'active') {
      whereClause += ' AND p.is_active = TRUE';
    } else if (status === 'inactive') {
      whereClause += ' AND p.is_active = FALSE';
    }

    if (featured === 'true') {
      whereClause += ' AND p.is_featured = TRUE';
    } else if (featured === 'false') {
      whereClause += ' AND p.is_featured = FALSE';
    }

    // Get products with images
    const [products] = await pool.execute(`
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        pi.image_url as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `, params);

    // Get statistics
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new,
        COUNT(CASE WHEN p.is_active = TRUE THEN 1 END) as active,
        COUNT(CASE WHEN p.is_featured = TRUE THEN 1 END) as featured
      FROM products p
    `);

    res.json({
      products: products.map(product => ({
        ...product,
        stock: product.stock_quantity,
        is_best_seller: false // Add this field for compatibility
      })),
      stats: stats[0],
      pagination: {
        page: page,
        limit: limit,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin products open error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Add new product
app.post('/api/admin/products', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, description, price, stock, category_id, brand_id, sku, weight, is_active, is_featured, is_best_seller } = req.body;

    // Generate slug from name
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    const [result] = await pool.execute(`
      INSERT INTO products 
      (name, slug, description, price, stock_quantity, category_id, brand_id, sku, weight, is_active, is_featured, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [name, slug, description, price, stock, category_id, brand_id, sku, weight, is_active || true, is_featured || false]);

    res.json({ 
      message: 'Product created successfully',
      productId: result.insertId 
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
app.put('/api/admin/products/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const productId = req.params.id;
    const { name, description, price, stock, category_id, brand_id, sku, weight, is_active, is_featured, is_best_seller } = req.body;

    // Generate slug from name
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    const [result] = await pool.execute(`
      UPDATE products 
      SET name = ?, slug = ?, description = ?, price = ?, stock_quantity = ?, 
          category_id = ?, brand_id = ?, sku = ?, weight = ?, is_active = ?, 
          is_featured = ?, updated_at = NOW()
      WHERE id = ?
    `, [name, slug, description, price, stock, category_id, brand_id, sku, weight, is_active, is_featured, productId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
app.delete('/api/admin/products/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const productId = req.params.id;

    console.log('🗑️ Deleting product:', productId);

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check if product exists
      const [productCheck] = await connection.execute('SELECT id FROM products WHERE id = ?', [productId]);
      if (productCheck.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Product not found' });
      }

      console.log('📋 Product found, checking dependencies...');

      // Check if product is referenced in order_items
      const [orderItems] = await connection.execute('SELECT COUNT(*) as count FROM order_items WHERE product_id = ?', [productId]);
      const orderItemsCount = orderItems[0].count;

      if (orderItemsCount > 0) {
        console.log(`⚠️ Product is referenced in ${orderItemsCount} order items`);
        
        // Option 1: Soft delete (recommended)
        await connection.execute('UPDATE products SET status = "deleted", updated_at = NOW() WHERE id = ?', [productId]);
        console.log('✅ Product soft deleted (marked as deleted)');
        
        await connection.commit();
        return res.json({ 
          message: 'Product marked as deleted (cannot delete due to existing orders)', 
          type: 'soft_delete',
          orderItemsCount 
        });
      }

      // If no dependencies, proceed with hard delete
      console.log('🗑️ No dependencies found, proceeding with hard delete...');

      // Delete product images first
      await connection.execute('DELETE FROM product_images WHERE product_id = ?', [productId]);
      console.log('🖼️ Product images deleted');

      // Delete from cart items
      await connection.execute('DELETE FROM cart_items WHERE product_id = ?', [productId]);
      console.log('🛒 Cart items deleted');

      // Delete from wishlist
      await connection.execute('DELETE FROM wishlist WHERE product_id = ?', [productId]);
      console.log('❤️ Wishlist items deleted');

      // Finally delete the product
      const [result] = await connection.execute('DELETE FROM products WHERE id = ?', [productId]);
      console.log('✅ Product deleted successfully');

      await connection.commit();
      res.json({ message: 'Product deleted successfully', type: 'hard_delete' });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Admin Categories API
app.get('/api/admin/categories', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [categories] = await pool.execute(`
      SELECT 
        c.*,
        pc.name as parent_name,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN categories pc ON c.parent_id = pc.id
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `);

    // Get statistics
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as parents,
        COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as children,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active
      FROM categories
    `);

    res.json({
      categories,
      stats: stats[0]
    });
  } catch (error) {
    console.error('Get admin categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Admin categories open endpoint (for demo/testing)
app.get('/api/admin/categories-open', async (req, res) => {
  try {
    const [categories] = await pool.execute(`
      SELECT 
        c.*,
        pc.name as parent_name,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN categories pc ON c.parent_id = pc.id
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `);

    // Get statistics
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as parents,
        COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as children,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active
      FROM categories
    `);

    res.json({
      categories,
      stats: stats[0]
    });
  } catch (error) {
    console.error('Get admin categories open error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Add new category
app.post('/api/admin/categories', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, slug, description, parent_id, image_url, sort_order, is_active } = req.body;

    const [result] = await pool.execute(`
      INSERT INTO categories 
      (name, slug, description, parent_id, image_url, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [name, slug, description, parent_id || null, image_url, sort_order || 0, is_active !== false]);

    res.json({ 
      message: 'Category created successfully',
      categoryId: result.insertId 
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
app.put('/api/admin/categories/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const categoryId = req.params.id;
    const { name, slug, description, parent_id, image_url, sort_order, is_active } = req.body;

    const [result] = await pool.execute(`
      UPDATE categories 
      SET name = ?, slug = ?, description = ?, parent_id = ?, image_url = ?, 
          sort_order = ?, is_active = ?, updated_at = NOW()
      WHERE id = ?
    `, [name, slug, description, parent_id || null, image_url, sort_order || 0, is_active !== false, categoryId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
app.delete('/api/admin/categories/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const categoryId = req.params.id;

    // Check if category has products
    const [products] = await pool.execute('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [categoryId]);
    if (products[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete category with products' });
    }

    // Check if category has children
    const [children] = await pool.execute('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?', [categoryId]);
    if (children[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete category with subcategories' });
    }

    const [result] = await pool.execute('DELETE FROM categories WHERE id = ?', [categoryId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Test endpoint without auth for debugging
app.get('/api/admin/users-test', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    console.log('Test params:', { page, limit, offset });

    const [users] = await pool.query(
      'SELECT id, email, first_name, last_name, phone, role, is_active, is_email_verified, is_phone_verified, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    res.json({ success: true, users, count: users.length });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Users API
app.get('/api/admin/users', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const { search, role, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    if (status === 'active') {
      whereClause += ' AND is_active = TRUE';
    } else if (status === 'inactive') {
      whereClause += ' AND is_active = FALSE';
    }

    // Get users
    const [users] = await pool.execute(`
      SELECT 
        id, email, first_name, last_name, phone, role, 
        is_active, is_email_verified, is_phone_verified, 
        avatar_url, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `, params);

    // Get statistics
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active,
        COUNT(CASE WHEN is_email_verified = TRUE THEN 1 END) as email_verified,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users
      FROM users
    `);

    res.json({
      users,
      stats: stats[0],
      pagination: {
        page: page,
        limit: limit,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin users open endpoint (for demo/testing)
app.get('/api/admin/users-open', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const { search, role, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    if (status === 'active') {
      whereClause += ' AND is_active = TRUE';
    } else if (status === 'inactive') {
      whereClause += ' AND is_active = FALSE';
    }

    // Get users
    const [users] = await pool.execute(`
      SELECT 
        id, email, first_name, last_name, phone, role, 
        is_active, is_email_verified, is_phone_verified, 
        avatar_url, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `, params);

    // Get statistics
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active,
        COUNT(CASE WHEN is_email_verified = TRUE THEN 1 END) as email_verified,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users
      FROM users
    `);

    res.json({
      users,
      stats: stats[0],
      pagination: {
        page: page,
        limit: limit,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin users open error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user
app.put('/api/admin/users/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const userId = req.params.id;
    const { is_active, is_email_verified, is_phone_verified, role } = req.body;

    const updateFields = [];
    const params = [];

    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(is_active);
    }

    if (is_email_verified !== undefined) {
      updateFields.push('is_email_verified = ?');
      params.push(is_email_verified);
    }

    if (is_phone_verified !== undefined) {
      updateFields.push('is_phone_verified = ?');
      params.push(is_phone_verified);
    }

    if (role !== undefined) {
      updateFields.push('role = ?');
      params.push(role);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updated_at = NOW()');
    params.push(userId);

    const [result] = await pool.execute(`
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
app.delete('/api/admin/users/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const userId = req.params.id;

    // Prevent deleting self
    if (req.user.id == userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user has orders
    const [orders] = await pool.execute('SELECT COUNT(*) as count FROM orders WHERE user_id = ?', [userId]);
    if (orders[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete user with existing orders' });
    }

    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get products with filters (duplicate endpoint - will be ignored if first one matches)
app.get('/api/products-filtered', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const { category, brand, search } = req.query;
    console.log('Getting products with filters:', { category, brand, search, limit, offset });
    
    let whereConditions = ['p.is_active = TRUE'];
    let params = [];
    
    if (category) {
      whereConditions.push('p.category_id = ?');
      params.push(category);
    }
    
    if (brand) {
      whereConditions.push('p.brand_id = ?');
      params.push(brand);
    }
    
    if (search) {
      whereConditions.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    const [products] = await pool.execute(`
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        pi.image_url as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    // Add imageUrl for compatibility
    products.forEach(product => {
      product.imageUrl = product.primary_image || 'assets/images/placeholder.jpg';
    });
    
    console.log('Found products:', products.length);
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Getting product:', id);
    
    const [products] = await pool.execute(`
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.id = ? AND p.is_active = TRUE
    `, [id]);
    
    if (products.length === 0) {
      console.log('Product not found:', id);
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const product = products[0];
    
    // Get product images
    const [images] = await pool.execute(`
      SELECT image_url, is_primary
      FROM product_images 
      WHERE product_id = ?
      ORDER BY is_primary DESC, id ASC
    `, [id]);
    
    product.images = images;
    product.primary_image = images.find(img => img.is_primary)?.image_url || images[0]?.image_url || 'assets/images/placeholder.jpg';
    
    console.log('Product found:', product.name, 'Images:', images.length);
    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Admin Dashboard Statistics API
app.get('/api/admin/statistics', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Total Revenue
    const [revenueResult] = await pool.execute(
      `SELECT SUM(total_amount) AS totalRevenue FROM orders WHERE status IN ('delivered', 'completed')`
    );
    const totalRevenue = revenueResult[0].totalRevenue || 0;

    // Total Orders
    const [totalOrdersResult] = await pool.execute(
      `SELECT COUNT(*) AS totalOrders FROM orders`
    );
    const totalOrders = totalOrdersResult[0].totalOrders || 0;

    // New Orders (last 24 hours)
    const [newOrdersResult] = await pool.execute(
      `SELECT COUNT(*) AS newOrders FROM orders WHERE created_at >= NOW() - INTERVAL 24 HOUR`
    );
    const newOrders = newOrdersResult[0].newOrders || 0;

    // Total Users
    const [totalUsersResult] = await pool.execute(
      `SELECT COUNT(*) AS totalUsers FROM users WHERE role = 'customer'`
    );
    const totalUsers = totalUsersResult[0].totalUsers || 0;

    // Total Products
    const [totalProductsResult] = await pool.execute(
      `SELECT COUNT(*) AS totalProducts FROM products WHERE is_active = TRUE`
    );
    const totalProducts = totalProductsResult[0].totalProducts || 0;

    // Growth calculations
    const [revenueGrowthResult] = await pool.execute(
      `SELECT 
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_amount ELSE 0 END) as currentMonth,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_amount ELSE 0 END) as previousMonth
      FROM orders WHERE status IN ('delivered', 'completed')`
    );
    
    const currentMonth = revenueGrowthResult[0].currentMonth || 0;
    const previousMonth = revenueGrowthResult[0].previousMonth || 0;
    const revenueGrowth = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth * 100) : 0;

    // Order Status Distribution
    const [orderStatusResult] = await pool.execute(
      `SELECT status, COUNT(*) AS count FROM orders GROUP BY status`
    );
    const orderStatus = orderStatusResult.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {});

    // Revenue by Month (last 6 months)
    const [revenueByMonthResult] = await pool.execute(
      `SELECT 
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        SUM(total_amount) AS revenue
      FROM orders
      WHERE status IN ('delivered', 'completed') AND created_at >= NOW() - INTERVAL 6 MONTH
      GROUP BY month
      ORDER BY month ASC`
    );

    // Top Selling Products (by quantity)
    const [topProductsResult] = await pool.execute(
      `SELECT 
        p.name AS productName, 
        SUM(oi.quantity) AS totalQuantitySold
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.name
      ORDER BY totalQuantitySold DESC
      LIMIT 5`
    );

    res.json({
      totalRevenue,
      totalOrders,
      newOrders,
      totalUsers,
      totalProducts,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      orderStatus,
      revenueByMonth: revenueByMonthResult,
      topSellingProducts: topProductsResult
    });

  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: 'An error occurred while fetching admin statistics'
    });
  }
});

// Admin Orders API
app.get('/api/admin/orders', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

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
    console.error('Get admin orders error:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: 'An error occurred while fetching orders'
    });
  }
});

// Admin Users API
app.get('/api/admin/users', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

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
    console.error('Get admin users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: 'An error occurred while fetching users'
    });
  }
});

// Dashboard Auto-Start Function (Integrated)
function startDashboardServices() {
  console.log('\n🎯 Admin Dashboard integrated into main server!');
  console.log('📊 Dashboard features available:');
  console.log('   • Statistics API: /api/admin/statistics');
  console.log('   • Orders API: /api/admin/orders');
  console.log('   • Products API: /api/admin/products');
  console.log('   • Users API: /api/admin/users');
  console.log('🌐 Dashboard URL: http://localhost:3000/admin-products.html');
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 EasyBuy Server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin-dashboard.html`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Login: http://localhost:${PORT}/api/auth/login`);
  console.log(`🛍️ Products: http://localhost:${PORT}/api/products`);
  console.log(`⭐ Featured: http://localhost:${PORT}/api/products/featured`);
  console.log(`🏆 Bestsellers: http://localhost:${PORT}/api/products/bestsellers`);
  
  // Auto-start dashboard services
  setTimeout(() => {
    startDashboardServices();
  }, 1000); // Wait 1 second for main server to be ready
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down EasyBuy Server...');
  
  // Stop dashboard services
  if (global.dashboardProcesses) {
    console.log('🛑 Stopping Dashboard Services...');
    global.dashboardProcesses.forEach((process, name) => {
      console.log(`🛑 Stopping ${name}...`);
      process.kill('SIGTERM');
    });
  }
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down EasyBuy Server (SIGTERM)...');
  
  // Stop dashboard services
  if (global.dashboardProcesses) {
    global.dashboardProcesses.forEach((process, name) => {
      console.log(`🛑 Stopping ${name}...`);
      process.kill('SIGTERM');
    });
  }
  
  process.exit(0);
});
