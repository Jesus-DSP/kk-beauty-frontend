// Order Service - Handles database operations for orders
const { query, getClient } = require('../database/connection');

class OrderService {
  
  // Create a new order with items
  static async createOrder(orderData) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Calculate totals
      const subtotal = orderData.items.reduce((sum, item) => 
        sum + (parseFloat(item.price.replace('$', '')) * item.quantity), 0
      );
      const taxAmount = subtotal * 0.08; // 8% tax
      const shippingAmount = 0; // Free shipping
      const totalAmount = subtotal + taxAmount + shippingAmount;
      
      // Generate friendly order ID
      const friendlyOrderId = `KK-${Date.now().toString().slice(-6)}`;
      
      // Insert main order
      const orderInsertQuery = `
        INSERT INTO orders (
          order_id, stripe_payment_intent_id, customer_name, customer_email, 
          customer_address, customer_city, customer_postal_code, customer_country,
          subtotal, tax_amount, shipping_amount, total_amount, currency, payment_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, order_id, created_at
      `;
      
      const orderValues = [
        friendlyOrderId,
        orderData.stripePaymentIntentId,
        orderData.customer.name,
        orderData.customer.email,
        orderData.customer.address,
        orderData.customer.city || null,
        orderData.customer.postalCode || null,
        orderData.customer.country || null,
        subtotal.toFixed(2),
        taxAmount.toFixed(2),
        shippingAmount.toFixed(2),
        totalAmount.toFixed(2),
        'USD',
        'succeeded'
      ];
      
      const orderResult = await client.query(orderInsertQuery, orderValues);
      const order = orderResult.rows[0];
      
      console.log('✅ Order created:', order);
      
      // Insert order items
      const itemInsertQuery = `
        INSERT INTO order_items (
          order_id, product_id, product_name, product_price, quantity, total_price
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      for (const item of orderData.items) {
        const itemPrice = parseFloat(item.price.replace('$', ''));
        const itemTotal = itemPrice * item.quantity;
        
        await client.query(itemInsertQuery, [
          order.id,
          item.id,
          item.name,
          itemPrice.toFixed(2),
          item.quantity,
          itemTotal.toFixed(2)
        ]);
        
        console.log('✅ Order item added:', item.name, 'x', item.quantity);
      }
      
      await client.query('COMMIT');
      
      return {
        success: true,
        orderId: order.order_id,
        dbOrderId: order.id,
        createdAt: order.created_at,
        totalAmount: totalAmount.toFixed(2),
        message: `Thank you ${orderData.customer.name}! Your order has been confirmed and will be processed shortly.`
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating order:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Get order by Stripe payment intent ID
  static async getOrderByPaymentIntent(paymentIntentId) {
    try {
      const orderQuery = `
        SELECT o.*, 
               json_agg(
                 json_build_object(
                   'id', oi.id,
                   'product_id', oi.product_id,
                   'product_name', oi.product_name,
                   'product_price', oi.product_price,
                   'quantity', oi.quantity,
                   'total_price', oi.total_price
                 )
               ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.stripe_payment_intent_id = $1
        GROUP BY o.id
      `;
      
      const result = await query(orderQuery, [paymentIntentId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error fetching order:', error);
      throw error;
    }
  }
  
  // Get order by friendly order ID
  static async getOrderById(orderId) {
    try {
      const orderQuery = `
        SELECT o.*, 
               json_agg(
                 json_build_object(
                   'id', oi.id,
                   'product_id', oi.product_id,
                   'product_name', oi.product_name,
                   'product_price', oi.product_price,
                   'quantity', oi.quantity,
                   'total_price', oi.total_price
                 )
               ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.order_id = $1
        GROUP BY o.id
      `;
      
      const result = await query(orderQuery, [orderId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error fetching order by ID:', error);
      throw error;
    }
  }
  
  // Update order status
  static async updateOrderStatus(orderId, status) {
    try {
      const updateQuery = `
        UPDATE orders 
        SET order_status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE order_id = $2
        RETURNING *
      `;
      
      const result = await query(updateQuery, [status, orderId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      throw error;
    }
  }
  
  // Get recent orders (for admin dashboard)
  static async getRecentOrders(limit = 10) {
    try {
      const ordersQuery = `
        SELECT o.*, 
               json_agg(
                 json_build_object(
                   'product_name', oi.product_name,
                   'quantity', oi.quantity,
                   'total_price', oi.total_price
                 )
               ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT $1
      `;
      
      const result = await query(ordersQuery, [limit]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching recent orders:', error);
      throw error;
    }
  }
}

module.exports = OrderService;
