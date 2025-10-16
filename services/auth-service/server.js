const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const redis = require('redis');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
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

// Email transporter
const emailTransporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const app = express();
const PORT = process.env.PORT || 3001;

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
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Generate refresh token
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Store refresh token in Redis
const storeRefreshToken = async (userId, refreshToken) => {
  try {
    await redisClient.setEx(`refresh_token:${userId}`, 7 * 24 * 3600, refreshToken); // 7 days
  } catch (error) {
    logger.error('Error storing refresh token:', error);
  }
};

// Verify refresh token
const verifyRefreshToken = async (userId, refreshToken) => {
  try {
    const storedToken = await redisClient.get(`refresh_token:${userId}`);
    return storedToken === refreshToken;
  } catch (error) {
    logger.error('Error verifying refresh token:', error);
    return false;
  }
};

// Generate email verification token
const generateEmailVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp, type) => {
  const subject = type === 'registration' ? 'Xác thực đăng ký tài khoản' : 'Mã OTP đăng nhập';
  
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
    await emailTransporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@easybuy.com',
      to: email,
      subject: subject,
      html: html
    });
    
    logger.info(`OTP sent to ${email}: ${otp}`);
    return true;
  } catch (error) {
    logger.error('Error sending OTP email:', error);
    return false;
  }
};

// Send verification email
const sendVerificationEmail = async (email, token) => {
  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    await emailTransporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@tmdt.com',
      to: email,
      subject: 'Verify Your Email - TMDT Store',
      html: `
        <h2>Welcome to TMDT Store!</h2>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>If the button doesn't work, copy and paste this link: ${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
      `
    });
    
    logger.info(`Verification email sent to ${email}`);
  } catch (error) {
    logger.error('Error sending verification email:', error);
    throw error;
  }
};

// Routes

// Register
app.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('phone').optional().isMobilePhone('vi-VN')
], validateRequest, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = generateEmailVerificationToken();

    // Create user
    const [result] = await pool.execute(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, is_email_verified, created_at) 
       VALUES (?, ?, ?, ?, ?, FALSE, NOW())`,
      [email, passwordHash, firstName, lastName, phone]
    );

    const userId = result.insertId;

    // Store verification token
    await redisClient.setEx(`email_verification:${verificationToken}`, 24 * 3600, userId.toString());

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    // Generate tokens
    const accessToken = generateToken({
      id: userId,
      email,
      role: 'customer',
      first_name: firstName,
      last_name: lastName
    });
    const refreshToken = generateRefreshToken();

    // Store refresh token
    await storeRefreshToken(userId, refreshToken);

    logger.info(`User registered: ${email}`);

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        id: userId,
        email,
        firstName,
        lastName,
        role: 'customer',
        isEmailVerified: false
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
});

// Login
app.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
], validateRequest, async (req, res) => {
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
    const refreshToken = generateRefreshToken();

    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);

    logger.info(`User logged in: ${email}`);

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
      refreshToken
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

// Refresh token
app.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required'
      });
    }

    // Find user by refresh token
    const userId = await redisClient.get(`refresh_token:${refreshToken}`);
    if (!userId) {
      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }

    // Get user data
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: 'User not found'
      });
    }

    const user = users[0];

    // Generate new tokens
    const newAccessToken = generateToken(user);
    const newRefreshToken = generateRefreshToken();

    // Update refresh token
    await storeRefreshToken(user.id, newRefreshToken);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed'
    });
  }
});

// Logout
app.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await redisClient.del(`refresh_token:${refreshToken}`);
    }

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed'
    });
  }
});

// Verify email
app.post('/verify-email', [
  body('token').notEmpty().withMessage('Verification token is required')
], validateRequest, async (req, res) => {
  try {
    const { token } = req.body;

    // Get user ID from token
    const userId = await redisClient.get(`email_verification:${token}`);
    if (!userId) {
      return res.status(400).json({
        error: 'Invalid or expired verification token'
      });
    }

    // Update user verification status
    await pool.execute(
      'UPDATE users SET is_email_verified = TRUE WHERE id = ?',
      [userId]
    );

    // Remove verification token
    await redisClient.del(`email_verification:${token}`);

    logger.info(`Email verified for user: ${userId}`);

    res.json({
      message: 'Email verified successfully'
    });

  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      error: 'Email verification failed'
    });
  }
});

// Forgot password
app.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], validateRequest, async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );

    if (users.length === 0) {
      // Don't reveal if user exists or not
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    const userId = users[0].id;
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store reset token (expires in 1 hour)
    await redisClient.setEx(`password_reset:${resetToken}`, 3600, userId.toString());

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await emailTransporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@tmdt.com',
      to: email,
      subject: 'Password Reset - TMDT Store',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If the button doesn't work, copy and paste this link: ${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });

    logger.info(`Password reset email sent to ${email}`);

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent'
    });

  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Password reset request failed'
    });
  }
});

// Reset password
app.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], validateRequest, async (req, res) => {
  try {
    const { token, password } = req.body;

    // Get user ID from token
    const userId = await redisClient.get(`password_reset:${token}`);
    if (!userId) {
      return res.status(400).json({
        error: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, userId]
    );

    // Remove reset token
    await redisClient.del(`password_reset:${token}`);

    // Invalidate all refresh tokens for this user
    const pattern = `refresh_token:${userId}`;
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    logger.info(`Password reset for user: ${userId}`);

    res.json({
      message: 'Password reset successfully'
    });

  } catch (error) {
    logger.error('Password reset error:', error);
    res.status(500).json({
      error: 'Password reset failed'
    });
  }
});

// OTP API endpoints

// Send OTP for registration
app.post('/send-otp-register', async (req, res) => {
  try {
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
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    // Store OTP in database
    await pool.execute(
      'INSERT INTO otp_verifications (email, otp_code, type, expires_at) VALUES (?, ?, ?, ?)',
      [email, otp, 'registration', expiresAt]
    );
    
    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, 'registration');
    
    if (emailSent) {
      res.json({ 
        message: 'OTP sent successfully',
        email: email,
        expiresIn: 300, // 5 minutes in seconds
        otp: process.env.NODE_ENV === 'development' ? otp : undefined // Show OTP in development
      });
    } else {
      res.status(500).json({ error: 'Failed to send OTP email' });
    }
    
  } catch (error) {
    logger.error('Send OTP registration error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Send OTP for login
app.post('/send-otp-login', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Email not registered' });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    // Store OTP in database
    await pool.execute(
      'INSERT INTO otp_verifications (email, otp_code, type, expires_at) VALUES (?, ?, ?, ?)',
      [email, otp, 'login', expiresAt]
    );
    
    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, 'login');
    
    if (emailSent) {
      res.json({ 
        message: 'OTP sent successfully',
        email: email,
        expiresIn: 300, // 5 minutes in seconds
        otp: process.env.NODE_ENV === 'development' ? otp : undefined // Show OTP in development
      });
    } else {
      res.status(500).json({ error: 'Failed to send OTP email' });
    }
    
  } catch (error) {
    logger.error('Send OTP login error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP for registration
app.post('/verify-otp-register', async (req, res) => {
  try {
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
    
    // Generate tokens
    const accessToken = generateToken({
      id: userId,
      email,
      role: 'customer',
      first_name: firstName,
      last_name: lastName
    });
    const refreshToken = generateRefreshToken();
    
    // Store refresh token
    await storeRefreshToken(userId, refreshToken);
    
    logger.info(`User registered via OTP: ${email}`);
    
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
      accessToken,
      refreshToken
    });
    
  } catch (error) {
    logger.error('Verify OTP registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify OTP for login
app.post('/verify-otp-login', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }
    
    // Verify OTP
    const [otpResults] = await pool.execute(
      'SELECT * FROM otp_verifications WHERE email = ? AND otp_code = ? AND type = ? AND is_used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, otp, 'login']
    );
    
    if (otpResults.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    // Mark OTP as used
    await pool.execute(
      'UPDATE otp_verifications SET is_used = TRUE WHERE id = ?',
      [otpResults[0].id]
    );
    
    // Get user info
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    // Update last login
    await pool.execute(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );
    
    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken();
    
    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);
    
    logger.info(`User logged in via OTP: ${email}`);
    
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
      refreshToken
    });
    
  } catch (error) {
    logger.error('Verify OTP login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-service',
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
    logger.info(`Auth Service running on port ${PORT}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
});

module.exports = app;

