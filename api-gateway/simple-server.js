const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 3000;

// Database configuration for XAMPP
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'easybuy',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Test database connection
async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('📊 Database config:', dbConfig);
    
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database');
    
    // Test query
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Total users in database: ${rows[0].count}`);
    
    // Check if admin user exists
    const [adminRows] = await connection.execute('SELECT * FROM users WHERE email = ?', ['admin@tmdt.com']);
    if (adminRows.length > 0) {
      console.log('👑 Admin user found:', adminRows[0].email);
    } else {
      console.log('❌ Admin user not found');
    }
    
    connection.release();
    console.log('✅ Database test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('❌ Full error:', error);
    return false;
  }
}

// JWT Secret
const JWT_SECRET = 'your_super_secret_jwt_key_here_change_in_production';

// Generate JWT token
const generateToken = (user) => {
  console.log('🔑 Generating token for user:', user);
  const token = jwt.sign(
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
  console.log('🔑 Token generated successfully');
  return token;
};

// Routes

// Health check
app.get('/health', (req, res) => {
  console.log('💚 Health check requested');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Registration endpoint - NO OTP REQUIRED
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📝 ===== REGISTRATION REQUEST START =====');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📝 Request headers:', req.headers);
    
    const { email, password, firstName, lastName, phone } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, password, firstName, and lastName are required'
      });
    }

    console.log('✅ All required fields present');

    // Check if user already exists
    console.log('🔍 Checking if user already exists...');
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    console.log('🔍 Existing users query result:', existingUsers);

    if (existingUsers.length > 0) {
      console.log('❌ User already exists');
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    console.log('✅ User does not exist, proceeding with registration');

    // Hash password
    console.log('🔐 Hashing password...');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    console.log('🔐 Password hashed successfully');

    // Create user directly (NO EMAIL VERIFICATION REQUIRED)
    console.log('👤 Creating user in database...');
    const [result] = await pool.execute(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, is_email_verified, is_active, created_at) 
       VALUES (?, ?, ?, ?, ?, TRUE, TRUE, NOW())`,
      [email, passwordHash, firstName, lastName, phone || null]
    );

    const userId = result.insertId;
    console.log('👤 User created with ID:', userId);

    // Generate token
    console.log('🔑 Generating access token...');
    const accessToken = generateToken({
      id: userId,
      email,
      role: 'customer',
      first_name: firstName,
      last_name: lastName
    });

    console.log('✅ User registered successfully:', { userId, email });
    console.log('📝 ===== REGISTRATION REQUEST END =====');

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: userId,
        email,
        firstName,
        lastName,
        role: 'customer',
        isEmailVerified: true
      },
      token: accessToken
    });

  } catch (error) {
    console.error('❌ ===== REGISTRATION ERROR =====');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Full error:', error);
    console.error('❌ ===== REGISTRATION ERROR END =====');
    
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
});

// Login endpoint - NO OTP REQUIRED
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 ===== LOGIN REQUEST START =====');
    console.log('🔐 Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔐 Request headers:', req.headers);
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    console.log('✅ Credentials provided');

    // Find user
    console.log('🔍 Looking for user in database...');
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );

    console.log('🔍 Users query result:', users);

    if (users.length === 0) {
      console.log('❌ User not found or inactive');
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const user = users[0];
    console.log('✅ User found:', { id: user.id, email: user.email, role: user.role });

    // Verify password
    console.log('🔐 Verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('🔐 Password verification result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    console.log('✅ Password verified successfully');

    // Update last login
    console.log('📝 Updating last login time...');
    await pool.execute(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );
    console.log('📝 Last login time updated');

    // Generate token
    console.log('🔑 Generating access token...');
    const accessToken = generateToken(user);

    console.log('✅ User logged in successfully:', { userId: user.id, email });
    console.log('🔐 ===== LOGIN REQUEST END =====');

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
      token: accessToken
    });

  } catch (error) {
    console.error('❌ ===== LOGIN ERROR =====');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Full error:', error);
    console.error('❌ ===== LOGIN ERROR END =====');
    
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

// OTP endpoints for registration
app.post('/api/auth/send-otp-register', async (req, res) => {
  try {
    console.log('📧 ===== SEND OTP REGISTER REQUEST START =====');
    console.log('📧 Request body:', JSON.stringify(req.body, null, 2));
    
    const { email, firstName, lastName, phone, password } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Generate OTP
    const otp = '123456'; // Demo OTP for development
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    // Store OTP in database
    await pool.execute(
      'INSERT INTO otp_verifications (email, otp_code, type, expires_at) VALUES (?, ?, ?, ?)',
      [email, otp, 'registration', expiresAt]
    );
    
    console.log('✅ OTP stored for registration:', { email, otp });
    console.log('📧 ===== SEND OTP REGISTER REQUEST END =====');
    
    res.json({ 
      message: 'OTP sent successfully',
      email: email,
      expiresIn: 300, // 5 minutes in seconds
      otp: otp // Show OTP in development
    });
    
  } catch (error) {
    console.error('❌ Send OTP registration error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

app.post('/api/auth/verify-otp-register', async (req, res) => {
  try {
    console.log('🔢 ===== VERIFY OTP REGISTER REQUEST START =====');
    console.log('🔢 Request body:', JSON.stringify(req.body, null, 2));
    
    const { email, otp, firstName, lastName, password, phone } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }
    
    // Verify OTP
    const [otpResults] = await pool.execute(
      'SELECT * FROM otp_verifications WHERE email = ? AND otp_code = ? AND type = ? AND is_used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, otp, 'registration']
    );
    
    if (otpResults.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    // Mark OTP as used
    await pool.execute(
      'UPDATE otp_verifications SET is_used = TRUE WHERE id = ?',
      [otpResults[0].id]
    );
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user account
    const [result] = await pool.execute(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, is_email_verified, role, is_active, created_at) 
       VALUES (?, ?, ?, ?, ?, TRUE, 'customer', TRUE, NOW())`,
      [email, passwordHash, firstName, lastName, phone]
    );
    
    const userId = result.insertId;
    
    // Generate token
    const accessToken = generateToken({
      id: userId,
      email,
      role: 'customer',
      first_name: firstName,
      last_name: lastName
    });
    
    console.log('✅ User registered via OTP:', { userId, email });
    console.log('🔢 ===== VERIFY OTP REGISTER REQUEST END =====');
    
    res.json({
      message: 'Registration successful',
      user: {
        id: userId,
        email,
        firstName,
        lastName,
        phone,
        role: 'customer',
        isEmailVerified: true
      },
      accessToken
    });
    
  } catch (error) {
    console.error('❌ Verify OTP registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  console.log('🔢 OTP verification request received (bypassed):', req.body);
  
  // Just return success - no actual verification
  res.json({
    message: 'OTP verified successfully',
    success: true
  });
});

// Admin User Management APIs

// Middleware to check admin authentication
const checkAdminAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all users with stats
app.get('/api/admin/users', checkAdminAuth, async (req, res) => {
  try {
    console.log('👥 ===== GET USERS REQUEST START =====');
    
    const { page = 1, limit = 10, search = '', role = '', status = '', verified = '' } = req.query;
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    let whereClause = '1=1';
    const params = [];
    
    if (search) {
      whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    
    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }
    
    if (status) {
      whereClause += ' AND is_active = ?';
      params.push(status === 'active' ? 1 : 0);
    }
    
    if (verified) {
      whereClause += ' AND is_email_verified = ?';
      params.push(verified === 'verified' ? 1 : 0);
    }
    
    // Get users
    const [users] = await pool.execute(
      `SELECT id, first_name, last_name, email, phone, role, is_active, 
              is_email_verified, is_phone_verified, created_at, avatar_url
       FROM users 
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    
    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
      params
    );
    
    // Get stats
    const [statsResult] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_users,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users
      FROM users
    `);
    
    console.log('✅ Users loaded successfully');
    console.log('👥 ===== GET USERS REQUEST END =====');
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      },
      stats: {
        total: statsResult[0].total,
        new: statsResult[0].new_users,
        active: statsResult[0].active_users,
        admin: statsResult[0].admin_users
      }
    });
    
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// Get single user
app.get('/api/admin/users/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: users[0] });
    
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: 'Failed to load user' });
  }
});

// Create new user
app.post('/api/admin/users', checkAdminAuth, async (req, res) => {
  try {
    console.log('👤 ===== CREATE USER REQUEST START =====');
    console.log('👤 Request body:', JSON.stringify(req.body, null, 2));
    
    const { first_name, last_name, email, phone, password, role, is_active, is_email_verified, is_phone_verified } = req.body;
    
    // Validate required fields
    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'first_name, last_name, email, password, and role are required'
      });
    }
    
    // Check if email already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'An account with this email already exists'
      });
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const [result] = await pool.execute(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, 
                         is_active, is_email_verified, is_phone_verified, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [first_name, last_name, email, phone || null, passwordHash, role, 
       is_active ? 1 : 0, is_email_verified ? 1 : 0, is_phone_verified ? 1 : 0]
    );
    
    const userId = result.insertId;
    
    console.log('✅ User created successfully:', { userId, email });
    console.log('👤 ===== CREATE USER REQUEST END =====');
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: userId,
        first_name,
        last_name,
        email,
        phone,
        role,
        is_active: is_active ? 1 : 0,
        is_email_verified: is_email_verified ? 1 : 0,
        is_phone_verified: is_phone_verified ? 1 : 0
      }
    });
    
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
app.put('/api/admin/users/:id', checkAdminAuth, async (req, res) => {
  try {
    console.log('✏️ ===== UPDATE USER REQUEST START =====');
    console.log('✏️ User ID:', req.params.id);
    console.log('✏️ Request body:', JSON.stringify(req.body, null, 2));
    
    const { id } = req.params;
    const { first_name, last_name, email, phone, password, role, is_active, is_email_verified, is_phone_verified } = req.body;
    
    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );
    
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if email already exists (excluding current user)
    const [emailCheck] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, id]
    );
    
    if (emailCheck.length > 0) {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'An account with this email already exists'
      });
    }
    
    // Build update query
    let updateFields = [];
    let params = [];
    
    if (first_name) {
      updateFields.push('first_name = ?');
      params.push(first_name);
    }
    
    if (last_name) {
      updateFields.push('last_name = ?');
      params.push(last_name);
    }
    
    if (email) {
      updateFields.push('email = ?');
      params.push(email);
    }
    
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      params.push(phone);
    }
    
    if (password) {
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      updateFields.push('password_hash = ?');
      params.push(passwordHash);
    }
    
    if (role) {
      updateFields.push('role = ?');
      params.push(role);
    }
    
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    
    if (is_email_verified !== undefined) {
      updateFields.push('is_email_verified = ?');
      params.push(is_email_verified ? 1 : 0);
    }
    
    if (is_phone_verified !== undefined) {
      updateFields.push('is_phone_verified = ?');
      params.push(is_phone_verified ? 1 : 0);
    }
    
    updateFields.push('updated_at = NOW()');
    params.push(id);
    
    // Update user
    await pool.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    console.log('✅ User updated successfully:', { id });
    console.log('✏️ ===== UPDATE USER REQUEST END =====');
    
    res.json({
      message: 'User updated successfully',
      user: {
        id: parseInt(id),
        first_name,
        last_name,
        email,
        phone,
        role,
        is_active: is_active ? 1 : 0,
        is_email_verified: is_email_verified ? 1 : 0,
        is_phone_verified: is_phone_verified ? 1 : 0
      }
    });
    
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
app.delete('/api/admin/users/:id', checkAdminAuth, async (req, res) => {
  try {
    console.log('🗑️ ===== DELETE USER REQUEST START =====');
    console.log('🗑️ User ID:', req.params.id);
    
    const { id } = req.params;
    
    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT id, role FROM users WHERE id = ?',
      [id]
    );
    
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deleting admin users
    if (existingUsers[0].role === 'admin') {
      return res.status(403).json({
        error: 'Cannot delete admin user',
        message: 'Admin users cannot be deleted'
      });
    }
    
    // Delete user
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    
    console.log('✅ User deleted successfully:', { id });
    console.log('🗑️ ===== DELETE USER REQUEST END =====');
    
    res.json({ message: 'User deleted successfully' });
    
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Catch all handler for frontend routes
app.get('*', (req, res) => {
  console.log('🌐 Frontend route requested:', req.originalUrl);
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log('🚀 ===== SERVER STARTING =====');
  console.log(`🚀 Simple Server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log('🚀 ===== SERVER STARTED =====');
  
  // Test database connection
  await testDatabaseConnection();
});

module.exports = app;

