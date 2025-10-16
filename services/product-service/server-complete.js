const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3003;

// Database connection
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'easybuy',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'product-service', port: PORT });
});

// Get categories (public)
app.get('/categories', async (req, res) => {
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

// Get brands
app.get('/brands', async (req, res) => {
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

// Get products (general)
app.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, category_id, brand_id, search } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE p.is_active = TRUE';
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
    
    const [products] = await pool.execute(`
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);
    
    const [totalCount] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `, params);
    
    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get featured products
app.get('/products/featured', async (req, res) => {
  try {
    const [products] = await pool.execute(`
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.is_active = TRUE AND p.is_featured = TRUE
      ORDER BY p.created_at DESC
      LIMIT 8
    `);

    res.json(products);
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
});

// Get bestseller products
app.get('/products/bestsellers', async (req, res) => {
  try {
    const [products] = await pool.execute(`
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        COALESCE(SUM(oi.quantity), 0) as total_sold
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
      WHERE p.is_active = TRUE
      GROUP BY p.id
      ORDER BY total_sold DESC, p.created_at DESC
      LIMIT 8
    `);

    res.json(products);
  } catch (error) {
    console.error('Get bestseller products error:', error);
    res.status(500).json({ error: 'Failed to fetch bestseller products' });
  }
});

// Get single product
app.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
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
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(products[0]);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Admin categories (open - no auth)
app.get('/admin/categories-open', async (req, res) => {
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Product Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Categories: http://localhost:${PORT}/categories`);
  console.log(`🛍️ Products: http://localhost:${PORT}/products`);
  console.log(`⭐ Featured: http://localhost:${PORT}/products/featured`);
  console.log(`🏆 Bestsellers: http://localhost:${PORT}/products/bestsellers`);
  console.log(`🔧 Admin Categories: http://localhost:${PORT}/admin/categories-open`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Product Service...');
  process.exit(0);
});

