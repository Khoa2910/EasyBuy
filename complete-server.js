const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 3000;

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
      params.push(`%${search}%`, `%${search}%`);
    }
    
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
      full_name: addr.recipient_name,
      phone: addr.phone,
      address: addr.address_line1,
      province: addr.city,
      district: addr.state,
      ward: addr.postal_code,
      is_default: Boolean(addr.is_default)
    }));

    res.json({
      success: true,
      addresses: transformedAddresses
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
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

    const [result] = await pool.execute(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, orderId]
    );

    console.log('📊 Update result:', result);

    if (result.affectedRows === 0) {
      console.log('❌ Order not found:', orderId);
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log(`✅ Order #${orderId} status updated to: ${status}`);
    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    console.error('❌ Admin update order status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
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

// User addresses routes
app.get('/api/user/addresses', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [addresses] = await pool.execute(
      'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [userId]
    );

    res.json({ addresses });
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 EasyBuy Server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Login: http://localhost:${PORT}/api/auth/login`);
  console.log(`🛍️ Products: http://localhost:${PORT}/api/products`);
  console.log(`⭐ Featured: http://localhost:${PORT}/api/products/featured`);
  console.log(`🏆 Bestsellers: http://localhost:${PORT}/api/products/bestsellers`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down EasyBuy Server...');
  process.exit(0);
});
