const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mysql = require('mysql2/promise');
const redis = require('redis');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const Stripe = require('stripe');
const axios = require('axios');
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

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Create payment intent
app.post('/create-payment-intent', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('orderId').isInt().withMessage('Order ID must be an integer'),
  body('customerId').optional().isInt().withMessage('Customer ID must be an integer')
], validateRequest, async (req, res) => {
  try {
    const { amount, currency = 'vnd', orderId, customerId, metadata = {} } = req.body;

    // Convert VND to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        orderId: orderId.toString(),
        customerId: customerId?.toString() || '',
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Store payment intent in database
    await pool.execute(
      `INSERT INTO payment_intents (stripe_payment_intent_id, order_id, customer_id, amount, currency, status, created_at) 
       VALUES (?, ?, ?, ?, ?, 'requires_payment_method', NOW())`,
      [paymentIntent.id, orderId, customerId, amount, currency]
    );

    logger.info(`Payment intent created: ${paymentIntent.id} for order ${orderId}`);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    logger.error('Create payment intent error:', error);
    res.status(500).json({
      error: 'Failed to create payment intent',
      message: 'An error occurred while creating the payment intent'
    });
  }
});

// Confirm payment
app.post('/confirm-payment', [
  body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
  body('orderId').isInt().withMessage('Order ID must be an integer')
], validateRequest, async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update payment intent in database
      await pool.execute(
        'UPDATE payment_intents SET status = ?, updated_at = NOW() WHERE stripe_payment_intent_id = ?',
        ['succeeded', paymentIntentId]
      );

      // Update order payment status
      await pool.execute(
        'UPDATE orders SET payment_status = ?, payment_reference = ?, updated_at = NOW() WHERE id = ?',
        ['paid', paymentIntentId, orderId]
      );

      // Notify order service about successful payment
      try {
        await axios.post(`${process.env.ORDER_SERVICE_URL}/payments/success`, {
          orderId,
          paymentIntentId,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency
        });
      } catch (notifyError) {
        logger.error('Failed to notify order service:', notifyError);
      }

      logger.info(`Payment confirmed: ${paymentIntentId} for order ${orderId}`);

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency
        }
      });
    } else {
      res.status(400).json({
        error: 'Payment not successful',
        message: `Payment status: ${paymentIntent.status}`
      });
    }

  } catch (error) {
    logger.error('Confirm payment error:', error);
    res.status(500).json({
      error: 'Failed to confirm payment',
      message: 'An error occurred while confirming the payment'
    });
  }
});

// Cancel payment
app.post('/cancel-payment', [
  body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required')
], validateRequest, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    // Cancel payment intent in Stripe
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    // Update payment intent in database
    await pool.execute(
      'UPDATE payment_intents SET status = ?, updated_at = NOW() WHERE stripe_payment_intent_id = ?',
      ['canceled', paymentIntentId]
    );

    logger.info(`Payment canceled: ${paymentIntentId}`);

    res.json({
      success: true,
      message: 'Payment canceled successfully',
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status
      }
    });

  } catch (error) {
    logger.error('Cancel payment error:', error);
    res.status(500).json({
      error: 'Failed to cancel payment',
      message: 'An error occurred while canceling the payment'
    });
  }
});

// Refund payment
app.post('/refund', [
  body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('reason').optional().isIn(['duplicate', 'fraudulent', 'requested_by_customer']).withMessage('Invalid refund reason')
], validateRequest, async (req, res) => {
  try {
    const { paymentIntentId, amount, reason = 'requested_by_customer' } = req.body;

    // Get payment intent to find the charge
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: 'Payment not successful',
        message: 'Cannot refund a payment that was not successful'
      });
    }

    // Create refund
    const refundData = {
      payment_intent: paymentIntentId,
      reason: reason
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await stripe.refunds.create(refundData);

    // Update payment intent status
    await pool.execute(
      'UPDATE payment_intents SET status = ?, updated_at = NOW() WHERE stripe_payment_intent_id = ?',
      ['refunded', paymentIntentId]
    );

    // Update order payment status
    const [orders] = await pool.execute(
      'SELECT id FROM orders WHERE payment_reference = ?',
      [paymentIntentId]
    );

    if (orders.length > 0) {
      await pool.execute(
        'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE payment_reference = ?',
        ['refunded', paymentIntentId]
      );
    }

    logger.info(`Refund created: ${refund.id} for payment ${paymentIntentId}`);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason
      }
    });

  } catch (error) {
    logger.error('Refund error:', error);
    res.status(500).json({
      error: 'Failed to process refund',
      message: 'An error occurred while processing the refund'
    });
  }
});

// Get payment methods
app.get('/payment-methods/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    // Get customer's payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    res.json({
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year
        }
      }))
    });

  } catch (error) {
    logger.error('Get payment methods error:', error);
    res.status(500).json({
      error: 'Failed to fetch payment methods',
      message: 'An error occurred while fetching payment methods'
    });
  }
});

// Webhook for Stripe events
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handlePaymentSuccess(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await handlePaymentFailure(failedPayment);
        break;

      case 'charge.dispute.created':
        const dispute = event.data.object;
        await handleDisputeCreated(dispute);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Handle successful payment
async function handlePaymentSuccess(paymentIntent) {
  try {
    const { id, metadata, amount, currency } = paymentIntent;
    const orderId = metadata.orderId;

    // Update payment intent status
    await pool.execute(
      'UPDATE payment_intents SET status = ?, updated_at = NOW() WHERE stripe_payment_intent_id = ?',
      ['succeeded', id]
    );

    // Update order payment status
    await pool.execute(
      'UPDATE orders SET payment_status = ?, payment_reference = ?, updated_at = NOW() WHERE id = ?',
      ['paid', id, orderId]
    );

    // Notify order service
    try {
      await axios.post(`${process.env.ORDER_SERVICE_URL}/payments/success`, {
        orderId: parseInt(orderId),
        paymentIntentId: id,
        amount: amount / 100,
        currency: currency
      });
    } catch (notifyError) {
      logger.error('Failed to notify order service:', notifyError);
    }

    logger.info(`Payment succeeded: ${id} for order ${orderId}`);
  } catch (error) {
    logger.error('Handle payment success error:', error);
  }
}

// Handle failed payment
async function handlePaymentFailure(paymentIntent) {
  try {
    const { id, metadata } = paymentIntent;
    const orderId = metadata.orderId;

    // Update payment intent status
    await pool.execute(
      'UPDATE payment_intents SET status = ?, updated_at = NOW() WHERE stripe_payment_intent_id = ?',
      ['failed', id]
    );

    // Update order payment status
    await pool.execute(
      'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      ['failed', orderId]
    );

    logger.info(`Payment failed: ${id} for order ${orderId}`);
  } catch (error) {
    logger.error('Handle payment failure error:', error);
  }
}

// Handle dispute created
async function handleDisputeCreated(dispute) {
  try {
    const { id, payment_intent, amount, currency, reason } = dispute;

    // Log dispute for manual review
    await pool.execute(
      `INSERT INTO payment_disputes (stripe_dispute_id, payment_intent_id, amount, currency, reason, status, created_at) 
       VALUES (?, ?, ?, ?, ?, 'open', NOW())`,
      [id, payment_intent, amount / 100, currency, reason]
    );

    // Notify admin about dispute
    try {
      await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/admin/dispute`, {
        disputeId: id,
        paymentIntentId: payment_intent,
        amount: amount / 100,
        currency: currency,
        reason: reason
      });
    } catch (notifyError) {
      logger.error('Failed to notify admin about dispute:', notifyError);
    }

    logger.info(`Dispute created: ${id} for payment ${payment_intent}`);
  } catch (error) {
    logger.error('Handle dispute created error:', error);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'payment-service',
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
    logger.info(`Payment Service running on port ${PORT}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
});

module.exports = app;

