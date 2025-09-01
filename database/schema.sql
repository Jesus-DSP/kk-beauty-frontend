-- KK Beauty Database Schema for PostgreSQL
-- Deploy this on Railway PostgreSQL

-- Create database (Railway will handle this)
-- CREATE DATABASE kk_beauty;

-- Orders table - stores main order information
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) UNIQUE NOT NULL,           -- Friendly order ID (e.g., KK-123456)
    stripe_payment_intent_id VARCHAR(100) NOT NULL,  -- Stripe payment intent ID
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_address TEXT NOT NULL,
    customer_city VARCHAR(100),
    customer_postal_code VARCHAR(20),
    customer_country VARCHAR(10),
    subtotal DECIMAL(10,2) NOT NULL,                -- Subtotal amount
    tax_amount DECIMAL(10,2) NOT NULL,              -- Tax amount
    shipping_amount DECIMAL(10,2) DEFAULT 0.00,    -- Shipping cost
    total_amount DECIMAL(10,2) NOT NULL,            -- Total paid amount
    currency VARCHAR(3) DEFAULT 'USD',
    payment_status VARCHAR(20) DEFAULT 'succeeded',
    order_status VARCHAR(20) DEFAULT 'processing',  -- processing, shipped, delivered, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table - stores individual items in each order
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER,                             -- Your internal product ID
    product_name VARCHAR(255) NOT NULL,
    product_price DECIMAL(10,2) NOT NULL,          -- Price per unit
    quantity INTEGER NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,            -- quantity * product_price
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
