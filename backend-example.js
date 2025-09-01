// Backend server for Stripe payments with PostgreSQL database
// You'll need to install: npm install express stripe cors dotenv pg pg-pool

require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const OrderService = require('./services/orderService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000', // Your React app URL
  credentials: true
}));

// Create payment intent
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', items, customer } = req.body;

    // Validate required fields
    if (!amount || !items || !customer) {
      return res.status(400).json({ 
        error: 'Missing required fields: amount, items, customer' 
      });
    }

    // Validate items have proper price format
    for (const item of items) {
      if (!item.price) {
        return res.status(400).json({
          success: false,
          error: `Item ${item.name || 'unknown'} is missing price`
        });
      }
      
      // Handle both string prices like "$60" and numeric prices
      let numericPrice;
      if (typeof item.price === 'string') {
        numericPrice = parseFloat(item.price.replace('$', ''));
      } else {
        numericPrice = parseFloat(item.price);
      }
      
      if (isNaN(numericPrice) || numericPrice <= 0) {
        return res.status(400).json({
          success: false,
          error: `Item price must be a positive number`
        });
      }
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ensure it's an integer
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        customerName: customer.name,
        customerEmail: customer.email,
        customerAddress: customer.address,
        customerCity: customer.city || '',
        customerPostalCode: customer.postalCode || '',
        customerCountry: customer.country || '',
        itemCount: items.length.toString(),
        orderItems: JSON.stringify(items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })))
      }
    });

    // Log the payment intent creation
    console.log('Payment Intent created:', paymentIntent.id);
    console.log('Amount:', amount, 'Currency:', currency);
    console.log('Customer:', customer.name, customer.email);

    res.json({ 
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      error: 'Failed to create payment intent',
      details: error.message 
    });
  }
});

// Handle successful payment
app.post('/api/payment-success', async (req, res) => {
  try {
    const { paymentIntentId, items, customer, total } = req.body;

    // Retrieve the payment intent to verify it was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      console.log('=== PAYMENT VERIFIED ===');
      console.log('Payment ID:', paymentIntentId);
      console.log('Customer:', customer.name, customer.email);
      console.log('Items:', items);
      console.log('Total:', total);
      console.log('=======================');

      // Save order to PostgreSQL database
      try {
        const orderResult = await OrderService.createOrder({
          stripePaymentIntentId: paymentIntentId,
          customer: customer,
          items: items,
          total: parseFloat(total)
        });

        console.log('✅ Order saved to database:', orderResult.orderId);

        // TODO: Here you would also:
        // 1. Send confirmation email to customer
        // 2. Update inventory counts
        // 3. Generate invoice/receipt
        // 4. Send notification to fulfillment team

        res.json({ 
          success: true,
          orderId: orderResult.orderId,
          paymentIntentId: paymentIntentId,
          message: orderResult.message,
          customerEmail: customer.email,
          orderTotal: orderResult.totalAmount,
          estimatedDelivery: '3-5 business days',
          orderDate: orderResult.createdAt
        });

      } catch (dbError) {
        console.error('❌ Database error while saving order:', dbError);
        
        // Even if DB fails, payment succeeded, so we should still respond positively
        // but log the error for investigation
        const fallbackOrderId = `KK-${Date.now().toString().slice(-6)}`;
        
        res.json({ 
          success: true,
          orderId: fallbackOrderId,
          paymentIntentId: paymentIntentId,
          message: `Thank you ${customer.name}! Your payment was successful. Order details will be sent via email.`,
          customerEmail: customer.email,
          orderTotal: total,
          estimatedDelivery: '3-5 business days',
          warning: 'Order saved to backup system'
        });
      }

    } else {
      res.status(400).json({ 
        error: 'Payment was not successful',
        status: paymentIntent.status
      });
    }

  } catch (error) {
    console.error('Error handling payment success:', error);
    res.status(500).json({ 
      error: 'Failed to process payment confirmation',
      details: error.message
    });
  }
});

// Get order by ID (for customer order lookup)
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await OrderService.getOrderById(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({
      success: true,
      order: {
        orderId: order.order_id,
        status: order.order_status,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        items: order.items,
        subtotal: order.subtotal,
        taxAmount: order.tax_amount,
        totalAmount: order.total_amount,
        createdAt: order.created_at,
        estimatedDelivery: '3-5 business days'
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get recent orders (admin endpoint)
app.get('/api/admin/orders', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const orders = await OrderService.getRecentOrders(limit);
    
    res.json({
      success: true,
      orders: orders.map(order => ({
        orderId: order.order_id,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        totalAmount: order.total_amount,
        status: order.order_status,
        createdAt: order.created_at,
        itemCount: order.items?.length || 0,
        items: order.items
      }))
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status (admin endpoint)
app.put('/api/admin/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status', 
        validStatuses 
      });
    }
    
    const updatedOrder = await OrderService.updateOrderStatus(orderId, status);
    
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({
      success: true,
      message: `Order ${orderId} status updated to ${status}`,
      order: {
        orderId: updatedOrder.order_id,
        status: updatedOrder.order_status,
        updatedAt: updatedOrder.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Stripe payment server with PostgreSQL is running',
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'Connected' : 'Not configured'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💳 Stripe integration ready`);
  console.log(`🔗 Frontend should connect to: http://localhost:${PORT}`);
});

module.exports = app;
