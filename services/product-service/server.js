const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mysql = require('mysql2/promise');
const redis = require('redis');
const { body, query, validationResult } = require('express-validator');
const winston = require('winston');
const multer = require('multer');
const AWS = require('aws-sdk');
const sharp = require('sharp');
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
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'tmdt_user',
  password: process.env.MYSQL_PASSWORD || 'tmdt_password',
  database: process.env.MYSQL_DATABASE || 'easybuy',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// AWS S3 configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

const app = express();
const PORT = process.env.PORT || 3003;

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
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Image upload to S3
const uploadToS3 = async (file, folder = 'products') => {
  try {
    // Resize and optimize image
    const optimizedImage = await sharp(file.buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const fileName = `${folder}/${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: optimizedImage,
      ContentType: 'image/jpeg',
      ACL: 'public-read'
    };

    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    logger.error('S3 upload error:', error);
    throw error;
  }
};

// Cache helper
const getCached = async (key) => {
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
};

const setCached = async (key, data, ttl = 300) => {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    logger.error('Cache set error:', error);
  }
};

// Routes

// Get all products with pagination and filters
app.get('/products', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().isInt().withMessage('Category must be an integer'),
  query('brand').optional().isInt().withMessage('Brand must be an integer'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
  query('sort').optional().isIn(['price_asc', 'price_desc', 'name_asc', 'name_desc', 'created_desc', 'rating_desc']).withMessage('Invalid sort option'),
  query('search').optional().isLength({ min: 1 }).withMessage('Search term cannot be empty')
], validateRequest, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      brand,
      minPrice,
      maxPrice,
      sort = 'created_desc',
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const cacheKey = `products:${JSON.stringify(req.query)}`;

    // Check cache first
    const cached = await getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let whereConditions = ['p.is_active = TRUE'];
    let queryParams = [];

    if (category) {
      whereConditions.push('p.category_id = ?');
      queryParams.push(category);
    }

    if (brand) {
      whereConditions.push('p.brand_id = ?');
      queryParams.push(brand);
    }

    if (minPrice) {
      whereConditions.push('p.price >= ?');
      queryParams.push(minPrice);
    }

    if (maxPrice) {
      whereConditions.push('p.price <= ?');
      queryParams.push(maxPrice);
    }

    if (search) {
      whereConditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    let orderClause = 'ORDER BY p.created_at DESC';
    switch (sort) {
      case 'price_asc':
        orderClause = 'ORDER BY p.price ASC';
        break;
      case 'price_desc':
        orderClause = 'ORDER BY p.price DESC';
        break;
      case 'name_asc':
        orderClause = 'ORDER BY p.name ASC';
        break;
      case 'name_desc':
        orderClause = 'ORDER BY p.name DESC';
        break;
      case 'rating_desc':
        orderClause = 'ORDER BY p.rating_average DESC';
        break;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
    `;
    const [countResult] = await pool.execute(countQuery, queryParams);
    const total = countResult[0].total;

    // Get products
    const productsQuery = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.short_description,
        p.sku,
        p.price,
        p.compare_price,
        p.stock_quantity,
        p.is_featured,
        p.is_bestseller,
        p.is_new,
        p.is_on_sale,
        p.sale_price,
        p.rating_average,
        p.rating_count,
        p.view_count,
        p.created_at,
        c.name as category_name,
        c.slug as category_slug,
        b.name as brand_name,
        b.slug as brand_slug,
        pi.image_url as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const [products] = await pool.execute(productsQuery, [...queryParams, parseInt(limit), offset]);

    // Get images for each product
    for (let product of products) {
      const [images] = await pool.execute(
        'SELECT image_url, alt_text, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order, id',
        [product.id]
      );
      product.images = images;
    }

    const result = {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    // Cache the result
    await setCached(cacheKey, result, 300); // 5 minutes

    res.json(result);

  } catch (error) {
    logger.error('Get products error:', error);
    res.status(500).json({
      error: 'Failed to fetch products',
      message: 'An error occurred while fetching products'
    });
  }
});

// Get single product by ID or slug
app.get('/products/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const cacheKey = `product:${identifier}`;

    // Check cache first
    const cached = await getCached(cacheKey);
    if (cached) {
      // Increment view count
      await pool.execute(
        'UPDATE products SET view_count = view_count + 1 WHERE id = ?',
        [cached.id]
      );
      return res.json(cached);
    }

    // Determine if identifier is ID or slug
    const isNumeric = /^\d+$/.test(identifier);
    const whereClause = isNumeric ? 'p.id = ?' : 'p.slug = ?';

    const productQuery = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        b.name as brand_name,
        b.slug as brand_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE ${whereClause} AND p.is_active = TRUE
    `;

    const [products] = await pool.execute(productQuery, [identifier]);

    if (products.length === 0) {
      return res.status(404).json({
        error: 'Product not found',
        message: 'The requested product does not exist'
      });
    }

    const product = products[0];

    // Get product images
    const [images] = await pool.execute(
      'SELECT image_url, alt_text, sort_order, is_primary FROM product_images WHERE product_id = ? ORDER BY sort_order, id',
      [product.id]
    );
    product.images = images;

    // Get product variants
    const [variants] = await pool.execute(
      'SELECT * FROM product_variants WHERE product_id = ? AND is_active = TRUE ORDER BY sort_order, id',
      [product.id]
    );
    product.variants = variants;

    // Get related products
    const [relatedProducts] = await pool.execute(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.price,
        p.sale_price,
        p.is_on_sale,
        p.rating_average,
        p.rating_count,
        pi.image_url as primary_image
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE p.category_id = ? AND p.id != ? AND p.is_active = TRUE
      ORDER BY p.rating_average DESC, p.created_at DESC
      LIMIT 8
    `, [product.category_id, product.id]);
    product.related_products = relatedProducts;

    // Increment view count
    await pool.execute(
      'UPDATE products SET view_count = view_count + 1 WHERE id = ?',
      [product.id]
    );

    // Cache the result
    await setCached(cacheKey, product, 600); // 10 minutes

    res.json(product);

  } catch (error) {
    logger.error('Get product error:', error);
    res.status(500).json({
      error: 'Failed to fetch product',
      message: 'An error occurred while fetching the product'
    });
  }
});

// Get categories
app.get('/categories', async (req, res) => {
  try {
    const cacheKey = 'categories:all';
    
    // Check cache first
    const cached = await getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

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

    // Cache the result
    await setCached(cacheKey, categories, 1800); // 30 minutes

    res.json(categories);

  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({
      error: 'Failed to fetch categories',
      message: 'An error occurred while fetching categories'
    });
  }
});

// Get brands
app.get('/brands', async (req, res) => {
  try {
    const cacheKey = 'brands:all';
    
    // Check cache first
    const cached = await getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

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

    // Cache the result
    await setCached(cacheKey, brands, 1800); // 30 minutes

    res.json(brands);

  } catch (error) {
    logger.error('Get brands error:', error);
    res.status(500).json({
      error: 'Failed to fetch brands',
      message: 'An error occurred while fetching brands'
    });
  }
});

// Upload product image
app.post('/products/:id/images', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isPrimary = false, altText = '' } = req.body;

    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided'
      });
    }

    // Check if product exists
    const [products] = await pool.execute(
      'SELECT id FROM products WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    // Upload to S3
    const imageUrl = await uploadToS3(req.file, 'products');

    // If this is set as primary, unset other primary images
    if (isPrimary) {
      await pool.execute(
        'UPDATE product_images SET is_primary = FALSE WHERE product_id = ?',
        [id]
      );
    }

    // Insert image record
    const [result] = await pool.execute(
      `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order) 
       VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM product_images WHERE product_id = ?))`,
      [id, imageUrl, altText, isPrimary, id]
    );

    // Clear product cache
    await redisClient.del(`product:${id}`);

    res.status(201).json({
      message: 'Image uploaded successfully',
      image: {
        id: result.insertId,
        imageUrl,
        altText,
        isPrimary
      }
    });

  } catch (error) {
    logger.error('Upload image error:', error);
    res.status(500).json({
      error: 'Failed to upload image',
      message: 'An error occurred while uploading the image'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'product-service',
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
app.listen(PORT, async () => {
  try {
    await redisClient.connect();
  logger.info(`Product Service running on port ${PORT}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
});

module.exports = app;

