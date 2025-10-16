const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mysql = require('mysql2/promise');
const redis = require('redis');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
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
  database: process.env.MYSQL_DATABASE || 'tmdt_ecommerce',
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

// Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const app = express();
const PORT = process.env.PORT || 3009;

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

// Get user notifications
app.get('/notifications', async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = ?';
    let queryParams = [userId];

    if (unreadOnly === 'true') {
      whereClause += ' AND is_read = FALSE';
    }

    const [notifications] = await pool.execute(`
      SELECT * FROM notifications 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total FROM notifications 
      ${whereClause}
    `, queryParams);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({
      error: 'Failed to fetch notifications',
      message: 'An error occurred while fetching notifications'
    });
  }
});

// Mark notification as read
app.put('/notifications/:id/read', async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const [result] = await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Notification not found'
      });
    }

    res.json({
      message: 'Notification marked as read'
    });

  } catch (error) {
    logger.error('Mark notification as read error:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: 'An error occurred while updating notification'
    });
  }
});

// Mark all notifications as read
app.put('/notifications/read-all', async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    res.json({
      message: 'All notifications marked as read'
    });

  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read',
      message: 'An error occurred while updating notifications'
    });
  }
});

// Delete notification
app.delete('/notifications/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const [result] = await pool.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Notification not found'
      });
    }

    res.json({
      message: 'Notification deleted'
    });

  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({
      error: 'Failed to delete notification',
      message: 'An error occurred while deleting notification'
    });
  }
});

// Send notification
app.post('/send', [
  body('userId').isInt().withMessage('User ID must be an integer'),
  body('type').isIn(['order', 'payment', 'shipping', 'promotion', 'system']).withMessage('Invalid notification type'),
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('message').trim().isLength({ min: 1 }).withMessage('Message is required'),
  body('data').optional().isObject().withMessage('Data must be an object'),
  body('sentVia').optional().isArray().withMessage('Sent via must be an array')
], validateRequest, async (req, res) => {
  try {
    const { userId, type, title, message, data, sentVia = ['in_app'] } = req.body;

    // Create notification record
    const [result] = await pool.execute(
      `INSERT INTO notifications (user_id, type, title, message, data, sent_via, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, type, title, message, JSON.stringify(data || {}), JSON.stringify(sentVia)]
    );

    const notificationId = result.insertId;

    // Send via different channels
    for (const channel of sentVia) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailNotification(userId, title, message, data);
            break;
          case 'sms':
            await this.sendSMSNotification(userId, message);
            break;
          case 'push':
            await this.sendPushNotification(userId, title, message, data);
            break;
        }
      } catch (channelError) {
        logger.error(`Failed to send ${channel} notification:`, channelError);
      }
    }

    // Update sent_at timestamp
    await pool.execute(
      'UPDATE notifications SET sent_at = NOW() WHERE id = ?',
      [notificationId]
    );

    logger.info(`Notification sent to user ${userId}: ${title}`);

    res.status(201).json({
      message: 'Notification sent successfully',
      notificationId
    });

  } catch (error) {
    logger.error('Send notification error:', error);
    res.status(500).json({
      error: 'Failed to send notification',
      message: 'An error occurred while sending notification'
    });
  }
});

// Send email notification
async function sendEmailNotification(userId, title, message, data) {
  try {
    // Get user email
    const [users] = await pool.execute(
      'SELECT email, first_name FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    await emailTransporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@tmdt.com',
      to: user.email,
      subject: title,
      html: `
        <h2>Xin chào ${user.first_name}!</h2>
        <p>${message}</p>
        ${data ? `<p>Chi tiết: ${JSON.stringify(data)}</p>` : ''}
        <hr>
        <p><small>Thông báo từ TMDT Store</small></p>
      `
    });

    logger.info(`Email notification sent to ${user.email}`);
  } catch (error) {
    logger.error('Email notification error:', error);
    throw error;
  }
}

// Send SMS notification
async function sendSMSNotification(userId, message) {
  try {
    // Get user phone
    const [users] = await pool.execute(
      'SELECT phone FROM users WHERE id = ? AND phone IS NOT NULL',
      [userId]
    );

    if (users.length === 0) {
      throw new Error('User phone not found');
    }

    const user = users[0];

    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: user.phone
    });

    logger.info(`SMS notification sent to ${user.phone}`);
  } catch (error) {
    logger.error('SMS notification error:', error);
    throw error;
  }
}

// Send push notification
async function sendPushNotification(userId, title, message, data) {
  try {
    // Store push notification in Redis for real-time delivery
    const pushData = {
      userId,
      title,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    await redisClient.lPush(`push_notifications:${userId}`, JSON.stringify(pushData));
    await redisClient.expire(`push_notifications:${userId}`, 86400); // 24 hours

    logger.info(`Push notification queued for user ${userId}`);
  } catch (error) {
    logger.error('Push notification error:', error);
    throw error;
  }
}

// Get push notifications for user
app.get('/push-notifications', async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await redisClient.lRange(`push_notifications:${userId}`, 0, -1);
    const parsedNotifications = notifications.map(n => JSON.parse(n));

    res.json(parsedNotifications);

  } catch (error) {
    logger.error('Get push notifications error:', error);
    res.status(500).json({
      error: 'Failed to fetch push notifications',
      message: 'An error occurred while fetching push notifications'
    });
  }
});

// Clear push notifications
app.delete('/push-notifications', async (req, res) => {
  try {
    const userId = req.user.id;

    await redisClient.del(`push_notifications:${userId}`);

    res.json({
      message: 'Push notifications cleared'
    });

  } catch (error) {
    logger.error('Clear push notifications error:', error);
    res.status(500).json({
      error: 'Failed to clear push notifications',
      message: 'An error occurred while clearing push notifications'
    });
  }
});

// Admin notification for disputes
app.post('/admin/dispute', [
  body('disputeId').notEmpty().withMessage('Dispute ID is required'),
  body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('reason').notEmpty().withMessage('Reason is required')
], validateRequest, async (req, res) => {
  try {
    const { disputeId, paymentIntentId, amount, currency, reason } = req.body;

    // Get admin users
    const [admins] = await pool.execute(
      'SELECT id, email, first_name FROM users WHERE role = "admin" AND is_active = TRUE'
    );

    for (const admin of admins) {
      await pool.execute(
        `INSERT INTO notifications (user_id, type, title, message, data, sent_via, created_at) 
         VALUES (?, 'system', 'Dispute Created', 'A new payment dispute has been created', ?, '["in_app", "email"]', NOW())`,
        [admin.id, JSON.stringify({
          disputeId,
          paymentIntentId,
          amount,
          currency,
          reason
        })]
      );

      // Send email to admin
      try {
        await emailTransporter.sendMail({
          from: process.env.FROM_EMAIL || 'noreply@tmdt.com',
          to: admin.email,
          subject: 'Payment Dispute Alert - TMDT Store',
          html: `
            <h2>Thông báo tranh chấp thanh toán</h2>
            <p>Xin chào ${admin.first_name},</p>
            <p>Một tranh chấp thanh toán mới đã được tạo:</p>
            <ul>
              <li><strong>Dispute ID:</strong> ${disputeId}</li>
              <li><strong>Payment Intent ID:</strong> ${paymentIntentId}</li>
              <li><strong>Số tiền:</strong> ${amount} ${currency}</li>
              <li><strong>Lý do:</strong> ${reason}</li>
            </ul>
            <p>Vui lòng xem xét và xử lý tranh chấp này.</p>
          `
        });
      } catch (emailError) {
        logger.error('Failed to send dispute email to admin:', emailError);
      }
    }

    logger.info(`Dispute notification sent to ${admins.length} admins`);

    res.json({
      message: 'Dispute notification sent to admins'
    });

  } catch (error) {
    logger.error('Admin dispute notification error:', error);
    res.status(500).json({
      error: 'Failed to send dispute notification',
      message: 'An error occurred while sending dispute notification'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notification-service',
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
    logger.info(`Notification Service running on port ${PORT}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
});

module.exports = app;

