const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// Session configuration
app.use(session({
  secret: 'easybuy-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'easybuy'
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('✅ Connected to MySQL database');
});

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = 'your-google-client-id'; // Thay đổi Client ID của bạn
const GOOGLE_CLIENT_SECRET = 'your-google-client-secret'; // Thay đổi Client Secret của bạn

// Passport configuration
passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists in database
    db.query('SELECT * FROM users WHERE google_id = ? OR email = ?', 
      [profile.id, profile.emails[0].value], 
      (err, results) => {
        if (err) {
          return done(err, null);
        }
        
        if (results.length > 0) {
          // User exists, update Google ID if needed
          if (!results[0].google_id) {
            db.query('UPDATE users SET google_id = ? WHERE id = ?', 
              [profile.id, results[0].id], (err) => {
                if (err) console.error('Error updating Google ID:', err);
              });
          }
          return done(null, results[0]);
        } else {
          // Create new user
          const newUser = {
            google_id: profile.id,
            email: profile.emails[0].value,
            first_name: profile.name.givenName,
            last_name: profile.name.familyName,
            avatar_url: profile.photos[0].value,
            is_email_verified: true,
            role: 'customer'
          };
          
          db.query(
            'INSERT INTO users (google_id, email, first_name, last_name, avatar_url, is_email_verified, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [newUser.google_id, newUser.email, newUser.first_name, newUser.last_name, newUser.avatar_url, newUser.is_email_verified, newUser.role],
            (err, result) => {
              if (err) {
                return done(err, null);
              }
              newUser.id = result.insertId;
              return done(null, newUser);
            }
          );
        }
      }
    );
  } catch (error) {
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id, done) => {
  db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
    if (err) {
      return done(err, null);
    }
    done(null, results[0]);
  });
});

// Email configuration - Cấu hình email thật để gửi OTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'easybuy082025@gmail.com', // Email Gmail của bạn
    pass: 'jagh zbig zsvb xzfq' // App password của bạn
  }
});

// Demo mode - chỉ log OTP ra console thay vì gửi email
const DEMO_MODE = false;

// OTP storage (in production, use Redis or database)
const otpStorage = new Map();

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email
async function sendOTPEmail(email, otp, type) {
  const subject = type === 'registration' ? 'Xác thực đăng ký tài khoản' : 'Mã OTP đăng nhập';
  
  if (DEMO_MODE) {
    // Demo mode - chỉ log OTP ra console
    console.log('\n' + '='.repeat(50));
    console.log('📧 DEMO MODE - OTP Email');
    console.log('='.repeat(50));
    console.log(`📧 To: ${email}`);
    console.log(`📝 Subject: ${subject}`);
    console.log(`🔢 OTP Code: ${otp}`);
    console.log('⏰ Valid for: 5 minutes');
    console.log('='.repeat(50));
    console.log('💡 Trong production, email này sẽ được gửi thật đến hộp thư của bạn');
    console.log('='.repeat(50) + '\n');
    return true;
  }

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
      from: 'EasyBuy <easybuy082025@gmail.com>', // Email của bạn
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
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', message: 'EasyBuy Server is running!' });
});

// Google OAuth Routes
app.get('/auth/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login.html?error=google_auth_failed' }),
  (req, res) => {
    // Successful authentication, redirect to frontend with user data
    const user = req.user;
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      avatar: user.avatar_url,
      role: user.role
    };
    
    // Store user data in session for frontend
    req.session.user = userData;
    
    // Redirect to frontend with success message
    res.redirect(`/login.html?google_success=1&user=${encodeURIComponent(JSON.stringify(userData))}`);
  }
);

// Logout route
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      res.redirect('/login.html?logout=1');
    });
  });
});

// Get current user info
app.get('/api/auth/me', (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user;
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      avatar: user.avatar_url,
      role: user.role
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Get categories
app.get('/api/categories', (req, res) => {
  db.query('SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order', (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Get products
app.get('/api/products', (req, res) => {
  const { page = 1, limit = 20, category, search, featured } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT p.*, c.name as category_name, b.name as brand_name,
           pi.image_url as primary_image
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
    WHERE p.is_active = TRUE
  `;
  
  const params = [];
  
  if (category) {
    query += ' AND p.category_id = ?';
    params.push(category);
  }
  
  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (featured === 'true') {
    query += ' AND p.is_featured = TRUE';
  }
  
  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM products p WHERE p.is_active = TRUE';
    const countParams = [];
    
    if (category) {
      countQuery += ' AND p.category_id = ?';
      countParams.push(category);
    }
    
    if (search) {
      countQuery += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    if (featured === 'true') {
      countQuery += ' AND p.is_featured = TRUE';
    }
    
    db.query(countQuery, countParams, (err, countResult) => {
      if (err) {
        console.error('Count error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        products: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      });
    });
  });
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  
  const query = `
    SELECT p.*, c.name as category_name, b.name as brand_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.id = ? AND p.is_active = TRUE
  `;
  
  db.query(query, [productId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const product = results[0];
    
    // Get product images
    db.query('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order', [productId], (err, images) => {
      if (err) {
        console.error('Images error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      product.images = images;
      res.json(product);
    });
  });
});

// Get brands
app.get('/api/brands', (req, res) => {
  db.query('SELECT * FROM brands WHERE is_active = TRUE ORDER BY name', (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Find user by email
  db.query('SELECT * FROM users WHERE email = ? AND is_active = TRUE', [email], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = results[0];

    // If user registered via Google and has no password, reject password login
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Account does not have a password. Please use Google login or reset password.' });
    }

    // Verify password
    bcrypt.compare(password, user.password_hash, (bcryptErr, isMatch) => {
      if (bcryptErr) {
        console.error('Bcrypt error:', bcryptErr);
        return res.status(500).json({ error: 'Internal error' });
      }

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id], () => {});

      const accessToken = 'mock-token-' + user.id;
    res.json({
      message: 'Login successful',
      user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          role: user.role || 'customer',
          avatar: user.avatar_url || null
        },
        accessToken
      });
    });
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  // Simple mock registration
  res.json({
    message: 'User registered successfully',
    user: {
      id: Date.now(),
      email,
      firstName,
      lastName,
      role: 'customer'
    },
    accessToken: 'mock-token-' + Date.now()
  });
});

// OTP API endpoints

// Send OTP for registration
app.post('/api/auth/send-otp-register', async (req, res) => {
  const { email, firstName, lastName } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  // Check if user already exists
  db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    // Store OTP in database
    db.query(
      'INSERT INTO otp_verifications (email, otp_code, type, expires_at) VALUES (?, ?, ?, ?)',
      [email, otp, 'registration', expiresAt],
      async (err, result) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Send OTP email
        const emailSent = await sendOTPEmail(email, otp, 'registration');
        
        if (emailSent) {
          res.json({ 
            message: 'OTP sent successfully',
            email: email,
            expiresIn: 300, // 5 minutes in seconds
            otp: DEMO_MODE ? otp : undefined // Chỉ trả về OTP trong demo mode
          });
        } else {
          res.status(500).json({ error: 'Failed to send OTP email' });
        }
      }
    );
  });
});

// Send OTP for login
app.post('/api/auth/send-otp-login', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  // Check if user exists
  db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Email not registered' });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    // Store OTP in database
    db.query(
      'INSERT INTO otp_verifications (email, otp_code, type, expires_at) VALUES (?, ?, ?, ?)',
      [email, otp, 'login', expiresAt],
      async (err, result) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Send OTP email
        const emailSent = await sendOTPEmail(email, otp, 'login');
        
        if (emailSent) {
          res.json({ 
            message: 'OTP sent successfully',
            email: email,
            expiresIn: 300, // 5 minutes in seconds
            otp: DEMO_MODE ? otp : undefined // Chỉ trả về OTP trong demo mode
          });
        } else {
          res.status(500).json({ error: 'Failed to send OTP email' });
        }
      }
    );
  });
});

// Verify OTP for registration
app.post('/api/auth/verify-otp-register', (req, res) => {
  const { email, otp, firstName, lastName, password, phone } = req.body;
  
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }
  
  // Verify OTP
  db.query(
    'SELECT * FROM otp_verifications WHERE email = ? AND otp_code = ? AND type = ? AND is_used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
    [email, otp, 'registration'],
    (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (results.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }
      
      // Mark OTP as used
      db.query(
        'UPDATE otp_verifications SET is_used = TRUE WHERE id = ?',
        [results[0].id],
        (err) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Create user account in database
          const saltRounds = 12;
          bcrypt.hash(password, saltRounds, (err, passwordHash) => {
            if (err) {
              console.error('Bcrypt error:', err);
              return res.status(500).json({ error: 'Password hashing failed' });
            }
          
            db.query(
              'INSERT INTO users (email, password_hash, first_name, last_name, phone, is_email_verified, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, TRUE, ?, TRUE, NOW())',
              [email, passwordHash, firstName || '', lastName || '', phone || '', 'customer'],
              (err, result) => {
                if (err) {
                  console.error('Database error:', err);
                  return res.status(500).json({ error: 'Database error' });
                }
                
                const userId = result.insertId;
                const accessToken = 'mock-token-' + userId;
                
                res.json({
                  message: 'Registration successful',
                  user: {
                    id: userId,
                    email,
                    firstName: firstName || '',
                    lastName: lastName || '',
                    phone: phone || '',
                    role: 'customer'
                  },
                  accessToken: accessToken
                });
              }
            );
          });
        }
      );
    }
  );
});

// Verify OTP for login
app.post('/api/auth/verify-otp-login', (req, res) => {
  const { email, otp } = req.body;
  
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }
  
  // Verify OTP
  db.query(
    'SELECT * FROM otp_verifications WHERE email = ? AND otp_code = ? AND type = ? AND is_used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
    [email, otp, 'login'],
    (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (results.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }
      
      // Mark OTP as used
      db.query(
        'UPDATE otp_verifications SET is_used = TRUE WHERE id = ?',
        [results[0].id],
        (err) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Get user info
          db.query('SELECT * FROM users WHERE email = ?', [email], (err, userResults) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            
            if (userResults.length === 0) {
              return res.status(404).json({ error: 'User not found' });
            }
            
            const user = userResults[0];
            const accessToken = 'mock-token-' + user.id;
            
            res.json({
              message: 'Login successful',
              user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
              },
              accessToken: accessToken
            });
          });
        }
      );
    }
  );
});

// -------- Simple auth helper (mock token) --------
function getUserIdFromAuth(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring('Bearer '.length).trim()
    : null;
  if (!token || !token.startsWith('mock-token-')) return null;
  const id = parseInt(token.replace('mock-token-', ''), 10);
  return Number.isNaN(id) ? null : id;
}

function requireAuth(req, res, next) {
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = userId;
  next();
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  console.log('🔍 Admin check - Auth header:', authHeader);
  
  const userId = getUserIdFromAuth(req);
  console.log('🔍 Admin check - User ID:', userId);
  
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  db.query('SELECT role FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });
    const role = (results[0].role || 'customer').toString().toLowerCase();
    console.log('🔍 Admin check - User role:', role);
    if (role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.userId = userId;
    next();
  });
}

// -------- User profile APIs --------
app.get('/api/user/profile', requireAuth, (req, res) => {
  db.query(
    'SELECT id, email, first_name, last_name, phone, date_of_birth, gender, avatar_url, is_email_verified, is_phone_verified, created_at, last_login_at FROM users WHERE id = ?',
    [req.userId],
    (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.length === 0) return res.status(404).json({ error: 'User not found' });
      res.json(results[0]);
    }
  );
});

app.put('/api/user/profile', requireAuth, (req, res) => {
  const { firstName, lastName, phone, dateOfBirth, gender } = req.body || {};
  const fields = [];
  const values = [];
  if (firstName !== undefined) { fields.push('first_name = ?'); values.push(firstName); }
  if (lastName !== undefined) { fields.push('last_name = ?'); values.push(lastName); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
  if (dateOfBirth !== undefined) { fields.push('date_of_birth = ?'); values.push(dateOfBirth); }
  if (gender !== undefined) { fields.push('gender = ?'); values.push(gender); }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.userId);
  db.query(`UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values, (err) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Profile updated successfully' });
  });
});

// -------- User addresses APIs --------
app.get('/api/user/addresses', requireAuth, (req, res) => {
  db.query(
    'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
    [req.userId],
    (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ addresses: results });
    }
  );
});

app.post('/api/user/addresses', requireAuth, (req, res) => {
  const { type, recipientName, phone, addressLine1, addressLine2, city, state, postalCode, country = 'Vietnam', isDefault = false } = req.body || {};
  if (!type || !recipientName || !phone || !addressLine1 || !city || !state || !postalCode) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const onDone = (err) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    db.query(
      `INSERT INTO user_addresses (user_id, type, is_default, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [req.userId, type, !!isDefault, recipientName, phone, addressLine1, addressLine2 || null, city, state, postalCode, country],
      (err2, result) => {
        if (err2) {
          console.error('Database error:', err2);
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ message: 'Address added successfully', addressId: result.insertId });
      }
    );
  };
  if (isDefault) {
    db.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?', [req.userId], onDone);
  } else {
    onDone();
  }
});

app.put('/api/user/addresses/:id', requireAuth, (req, res) => {
  const addressId = req.params.id;
  const data = req.body || {};
  const map = {
    type: 'type',
    recipientName: 'recipient_name',
    phone: 'phone',
    addressLine1: 'address_line1',
    addressLine2: 'address_line2',
    city: 'city',
    state: 'state',
    postalCode: 'postal_code',
    country: 'country',
    isDefault: 'is_default'
  };
  const fields = [];
  const values = [];
  Object.keys(map).forEach((k) => {
    if (data[k] !== undefined) {
      fields.push(`${map[k]} = ?`);
      values.push(data[k]);
    }
  });
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  const finalize = () => {
    values.push(addressId, req.userId);
    db.query(`UPDATE user_addresses SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ? AND user_id = ?`, values, (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Address updated successfully' });
    });
  };
  if (data.isDefault) {
    db.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?', [req.userId], (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      finalize();
    });
  } else {
    finalize();
  }
});

app.delete('/api/user/addresses/:id', requireAuth, (req, res) => {
  db.query('DELETE FROM user_addresses WHERE id = ? AND user_id = ?', [req.params.id, req.userId], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Address not found' });
    res.json({ message: 'Address deleted successfully' });
  });
});

// -------- Admin APIs --------
// Get users list
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const q = `SELECT id, first_name, last_name, email, phone, role, is_active, is_email_verified,
                   created_at
             FROM users
             ORDER BY id DESC`;
  db.query(q, [], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const stats = {
      total: results.length,
      admin: results.filter(u => u.role === 'admin').length
    };
    res.json({ users: results, stats });
  });
});

// Temporary open endpoint for debugging/fallback (no auth)
app.get('/api/admin/users-open', (req, res) => {
  const q = `SELECT id, first_name, last_name, email, phone, role, is_active, is_email_verified, is_phone_verified,
                   created_at
             FROM users
             ORDER BY id DESC`;
  db.query(q, [], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const stats = {
      total: results.length,
      admin: results.filter(u => (u.role||'').toString().toLowerCase() === 'admin').length
    };
    res.json({ users: results, stats, warning: 'users-open is for debug only' });
  });
});

// Create user (open endpoint for demo)
app.post('/api/admin/users-open', (req, res) => {
  const { first_name, last_name, email, phone, password, role = 'customer', is_active = true, is_email_verified = false, is_phone_verified = false } = req.body || {};
  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const saltRounds = 12;
  bcrypt.hash(password, saltRounds, (err, passwordHash) => {
    if (err) {
      console.error('Bcrypt error:', err);
      return res.status(500).json({ error: 'Hash error' });
    }
    const q = `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_active, is_email_verified, is_phone_verified, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
    db.query(q, [first_name, last_name, email, phone || null, passwordHash, role, !!is_active, !!is_email_verified, !!is_phone_verified], (dberr, result) => {
      if (dberr) {
        console.error('Database error:', dberr);
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id: result.insertId, message: 'User created successfully (demo mode)' });
    });
  });
});

// Update user (open endpoint for demo)
app.put('/api/admin/users-open/:id', (req, res) => {
  const userId = req.params.id;
  const { first_name, last_name, email, phone, password, role, is_active, is_email_verified, is_phone_verified } = req.body || {};
  const fields = [];
  const values = [];
  if (first_name !== undefined) { fields.push('first_name = ?'); values.push(first_name); }
  if (last_name !== undefined) { fields.push('last_name = ?'); values.push(last_name); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
  if (role !== undefined) { fields.push('role = ?'); values.push(role); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(!!is_active); }
  if (is_email_verified !== undefined) { fields.push('is_email_verified = ?'); values.push(!!is_email_verified); }
  if (is_phone_verified !== undefined) { fields.push('is_phone_verified = ?'); values.push(!!is_phone_verified); }

  const finalize = () => {
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(userId);
    db.query(`UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values, (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'User updated successfully (demo mode)' });
    });
  };

  if (password) {
    const saltRounds = 12;
    bcrypt.hash(password, saltRounds, (hashErr, passwordHash) => {
      if (hashErr) {
        console.error('Bcrypt error:', hashErr);
        return res.status(500).json({ error: 'Hash error' });
      }
      fields.push('password_hash = ?');
      values.push(passwordHash);
      finalize();
    });
  } else {
    finalize();
  }
});

// Delete user (open endpoint for demo)
app.delete('/api/admin/users-open/:id', (req, res) => {
  const userId = req.params.id;
  db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully (demo mode)' });
  });
});

// Create user
app.post('/api/admin/users', requireAdmin, (req, res) => {
  const { first_name, last_name, email, phone, password, role = 'customer', is_active = true, is_email_verified = false, is_phone_verified = false } = req.body || {};
  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const saltRounds = 12;
  bcrypt.hash(password, saltRounds, (err, passwordHash) => {
    if (err) {
      console.error('Bcrypt error:', err);
      return res.status(500).json({ error: 'Hash error' });
    }
    const q = `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_active, is_email_verified, is_phone_verified, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
    db.query(q, [first_name, last_name, email, phone || null, passwordHash, role, !!is_active, !!is_email_verified, !!is_phone_verified], (dberr, result) => {
      if (dberr) {
        console.error('Database error:', dberr);
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id: result.insertId });
    });
  });
});

// Update user
app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  const { first_name, last_name, email, phone, password, role, is_active, is_email_verified, is_phone_verified } = req.body || {};
  const fields = [];
  const values = [];
  if (first_name !== undefined) { fields.push('first_name = ?'); values.push(first_name); }
  if (last_name !== undefined) { fields.push('last_name = ?'); values.push(last_name); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
  if (role !== undefined) { fields.push('role = ?'); values.push(role); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(!!is_active); }
  if (is_email_verified !== undefined) { fields.push('is_email_verified = ?'); values.push(!!is_email_verified); }
  if (is_phone_verified !== undefined) { fields.push('is_phone_verified = ?'); values.push(!!is_phone_verified); }

  const finalize = () => {
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(userId);
    db.query(`UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values, (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'User updated' });
    });
  };

  if (password) {
    const saltRounds = 12;
    bcrypt.hash(password, saltRounds, (hashErr, passwordHash) => {
      if (hashErr) {
        console.error('Bcrypt error:', hashErr);
        return res.status(500).json({ error: 'Hash error' });
      }
      fields.push('password_hash = ?');
      values.push(passwordHash);
      finalize();
    });
  } else {
    finalize();
  }
});

// Delete user
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  });
});

// Cart endpoints moved to bottom of file

// Wishlist endpoints (mock)
app.get('/api/wishlist', (req, res) => {
  res.json([]);
});

app.post('/api/wishlist', (req, res) => {
  res.json({
    message: 'Added to wishlist'
  });
});

// Admin API endpoints
app.get('/api/admin/stats', (req, res) => {
  res.json({
    totalRevenue: 125000000,
    newOrders: 24,
    totalUsers: 1234,
    totalProducts: 156,
    recentOrders: [
      { id: 'ORD001', customer: 'Nguyễn Văn A', total: 1250000, status: 'delivered', date: '2024-01-15' },
      { id: 'ORD002', customer: 'Trần Thị B', total: 750000, status: 'shipping', date: '2024-01-16' },
      { id: 'ORD003', customer: 'Lê Văn C', total: 320000, status: 'pending', date: '2024-01-17' }
    ]
  });
});

// Removed duplicate /api/admin/users endpoint - using the one with requireAdmin middleware above

// -------- Admin Products APIs --------
// Get products list
app.get('/api/admin/products', requireAdmin, (req, res) => {
  const q = `SELECT p.*, c.name as category_name, b.name as brand_name,
                   pi.image_url as primary_image
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN brands b ON p.brand_id = b.id
             LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
             ORDER BY p.id DESC`;
  db.query(q, [], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    // Map stock_quantity to stock for frontend compatibility
    const products = results.map(p => ({
      ...p,
      stock: p.stock_quantity,
      is_best_seller: p.is_bestseller
    }));
    const stats = {
      total: products.length,
      new: products.slice(0, 30).length,
      active: products.filter(p => p.is_active).length,
      featured: products.filter(p => p.is_featured).length
    };
    res.json({ products, stats });
  });
});

// Temporary open endpoint for debugging/fallback (no auth)
app.get('/api/admin/products-open', (req, res) => {
  const q = `SELECT p.*, c.name as category_name, b.name as brand_name,
                   pi.image_url as primary_image
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN brands b ON p.brand_id = b.id
             LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
             ORDER BY p.id DESC`;
  db.query(q, [], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    // Map stock_quantity to stock for frontend compatibility
    const products = results.map(p => ({
      ...p,
      stock: p.stock_quantity,
      is_best_seller: p.is_bestseller
    }));
    const stats = {
      total: products.length,
      new: products.slice(0, 30).length,
      active: products.filter(p => p.is_active).length,
      featured: products.filter(p => p.is_featured).length
    };
    res.json({ products, stats, warning: 'products-open is for debug only' });
  });
});

// Create product (open endpoint for demo)
app.post('/api/admin/products-open', (req, res) => {
  const { name, description, price, stock, category_id, brand_id, sku, weight, is_active = true, is_featured = false, is_best_seller = false } = req.body || {};
  if (!name || !price || !category_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Generate slug from name
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  const q = `INSERT INTO products (name, slug, description, price, stock_quantity, category_id, brand_id, sku, weight, is_active, is_featured, is_bestseller, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
  db.query(q, [name, slug, description || null, price, stock || 0, category_id, brand_id || null, sku || null, weight || null, !!is_active, !!is_featured, !!is_best_seller], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ id: result.insertId, message: 'Product created successfully (demo mode)' });
  });
});

// Update product (open endpoint for demo)
app.put('/api/admin/products-open/:id', (req, res) => {
  const productId = req.params.id;
  const { name, description, price, stock, category_id, brand_id, sku, weight, is_active, is_featured, is_best_seller } = req.body || {};
  
  const fields = [];
  const values = [];
  if (name !== undefined) { 
    fields.push('name = ?'); 
    values.push(name);
    // Update slug when name changes
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    fields.push('slug = ?');
    values.push(slug);
  }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (price !== undefined) { fields.push('price = ?'); values.push(price); }
  if (stock !== undefined) { fields.push('stock_quantity = ?'); values.push(stock); }
  if (category_id !== undefined) { fields.push('category_id = ?'); values.push(category_id); }
  if (brand_id !== undefined) { fields.push('brand_id = ?'); values.push(brand_id); }
  if (sku !== undefined) { fields.push('sku = ?'); values.push(sku); }
  if (weight !== undefined) { fields.push('weight = ?'); values.push(weight); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(!!is_active); }
  if (is_featured !== undefined) { fields.push('is_featured = ?'); values.push(!!is_featured); }
  if (is_best_seller !== undefined) { fields.push('is_bestseller = ?'); values.push(!!is_best_seller); }
  
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(productId);
  
  db.query(`UPDATE products SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values, (err) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Product updated successfully (demo mode)' });
  });
});

// Delete product (open endpoint for demo)
app.delete('/api/admin/products-open/:id', (req, res) => {
  const productId = req.params.id;
  db.query('DELETE FROM products WHERE id = ?', [productId], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully (demo mode)' });
  });
});

// Create product
app.post('/api/admin/products', requireAdmin, (req, res) => {
  const { name, description, price, stock, category_id, brand_id, sku, weight, is_active = true, is_featured = false, is_best_seller = false } = req.body || {};
  if (!name || !price || !category_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Generate slug from name
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  const q = `INSERT INTO products (name, slug, description, price, stock_quantity, category_id, brand_id, sku, weight, is_active, is_featured, is_bestseller, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
  db.query(q, [name, slug, description || null, price, stock || 0, category_id, brand_id || null, sku || null, weight || null, !!is_active, !!is_featured, !!is_best_seller], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ id: result.insertId, message: 'Product created successfully' });
  });
});

// Update product
app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const productId = req.params.id;
  const { name, description, price, stock, category_id, brand_id, sku, weight, is_active, is_featured, is_best_seller } = req.body || {};
  
  const fields = [];
  const values = [];
  if (name !== undefined) { 
    fields.push('name = ?'); 
    values.push(name);
    // Update slug when name changes
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    fields.push('slug = ?');
    values.push(slug);
  }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (price !== undefined) { fields.push('price = ?'); values.push(price); }
  if (stock !== undefined) { fields.push('stock_quantity = ?'); values.push(stock); }
  if (category_id !== undefined) { fields.push('category_id = ?'); values.push(category_id); }
  if (brand_id !== undefined) { fields.push('brand_id = ?'); values.push(brand_id); }
  if (sku !== undefined) { fields.push('sku = ?'); values.push(sku); }
  if (weight !== undefined) { fields.push('weight = ?'); values.push(weight); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(!!is_active); }
  if (is_featured !== undefined) { fields.push('is_featured = ?'); values.push(!!is_featured); }
  if (is_best_seller !== undefined) { fields.push('is_bestseller = ?'); values.push(!!is_best_seller); }
  
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(productId);
  
  db.query(`UPDATE products SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values, (err) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Product updated successfully' });
  });
});

// Delete product
app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const productId = req.params.id;
  db.query('DELETE FROM products WHERE id = ?', [productId], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  });
});

app.get('/api/admin/orders', (req, res) => {
  res.json([
    { id: 'ORD001', customer: 'Nguyễn Văn A', total: 1250000, status: 'delivered', createdAt: '2024-01-15' },
    { id: 'ORD002', customer: 'Trần Thị B', total: 750000, status: 'shipping', createdAt: '2024-01-16' },
    { id: 'ORD003', customer: 'Lê Văn C', total: 320000, status: 'pending', createdAt: '2024-01-17' }
  ]);
});

app.get('/api/admin/categories', (req, res) => {
  res.json([
    { id: 1, name: 'Đồ dùng nhà bếp', description: 'Các sản phẩm cho nhà bếp', productCount: 45, status: 'active' },
    { id: 2, name: 'Nội thất', description: 'Bàn ghế, tủ kệ', productCount: 32, status: 'active' },
    { id: 3, name: 'Đồ dùng làm sạch', description: 'Dụng cụ vệ sinh', productCount: 28, status: 'active' }
  ]);
});

app.get('/api/admin/reviews', (req, res) => {
  res.json([
    { id: 1, productName: 'Bộ nồi inox', userName: 'Nguyễn Văn A', rating: 5, content: 'Sản phẩm rất tốt', createdAt: '2024-01-15' },
    { id: 2, productName: 'Máy xay sinh tố', userName: 'Trần Thị B', rating: 4, content: 'Tốt nhưng hơi ồn', createdAt: '2024-01-16' }
  ]);
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Serve other HTML pages
app.get('/orders.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'orders.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'register.html'));
});

app.get('/products.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'products.html'));
});

app.get('/cart.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'cart.html'));
});

app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'profile.html'));
});

app.get('/wishlist.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'wishlist.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin.html'));
});

app.get('/admin-users.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin-users.html'));
});

app.get('/admin-products.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin-products.html'));
});

app.get('/verify-otp.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'verify-otp.html'));
});

app.get('/product-detail.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'product-detail.html'));
});

// ==================== CART API ENDPOINTS ====================

// Mock cart data - always has items
const getMockCart = () => ({
  items: [
    {
      id: 1,
      productId: 1,
      productName: 'Máy nước nóng Ariston 15L',
      productImage: 'assets/images/products/water-heater.jpg',
      price: 2990000,
      quantity: 1,
      subtotal: 2990000
    },
    {
      id: 2,
      productId: 2,
      productName: 'Tủ lạnh Samsung 300L',
      productImage: 'assets/images/products/refrigerator.jpg',
      price: 8500000,
      quantity: 1,
      subtotal: 8500000
    },
    {
      id: 3,
      productId: 3,
      productName: 'Máy giặt LG 8kg',
      productImage: 'assets/images/products/washing-machine.jpg',
      price: 6500000,
      quantity: 1,
      subtotal: 6500000
    },
    {
      id: 4,
      productId: 4,
      productName: 'TV Samsung 55 inch',
      productImage: 'assets/images/products/tv.jpg',
      price: 12000000,
      quantity: 1,
      subtotal: 12000000
    },
    {
      id: 5,
      productId: 5,
      productName: 'Điều hòa Daikin 1.5HP',
      productImage: 'assets/images/products/air-conditioner.jpg',
      price: 7500000,
      quantity: 1,
      subtotal: 7500000
    }
  ],
  subtotal: 37400000,
  itemCount: 5
});

let mockCart = getMockCart();

// Get cart items
app.get('/api/cart', (req, res) => {
  // Get user ID (for now, use user ID 1 as default)
  const userId = 1;
  
  const query = `
    SELECT 
      ci.id,
      ci.product_id as productId,
      p.name as productName,
      pi.image_url as productImage,
      ci.price,
      ci.quantity,
      (ci.price * ci.quantity) as subtotal
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
    WHERE ci.user_id = ?
    ORDER BY ci.created_at DESC
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      // Fallback to mock data if database fails
      const cartData = getMockCart();
      res.json(cartData);
      return;
    }
    
    const subtotal = results.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    
    const cartData = {
      items: results,
      subtotal: subtotal,
      itemCount: results.length
    };
    
    res.json(cartData);
  });
});

// Add item to cart
app.post('/api/cart/add', (req, res) => {
  const { productId, quantity } = req.body;
  
  // Mock response
  res.json({ 
    message: 'Item added to cart',
    cart: mockCart
  });
});

// Update cart item quantity
app.put('/api/cart/update/:itemId', (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;
  
  // Mock response
  res.json({ 
    message: 'Cart updated',
    cart: mockCart
  });
});

// Remove item from cart
app.delete('/api/cart/remove/:itemId', (req, res) => {
  const { itemId } = req.params;
  
  // Mock response
  res.json({ 
    message: 'Item removed from cart',
    cart: mockCart
  });
});

// Clear cart
app.delete('/api/cart/clear', (req, res) => {
  mockCart = getMockCart(); // Reset to default mock data
  
  res.json({ 
    message: 'Cart cleared',
    cart: mockCart
  });
});

// ==================== END CART API ====================

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TMDT Server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  db.end();
  process.exit(0);
});
