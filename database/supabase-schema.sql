-- KK Beauty Database Schema for Supabase (PostgreSQL)
-- This schema is compatible with Supabase's PostgreSQL instance

-- Enable Row Level Security (RLS) - Supabase best practice
-- Note: You can configure RLS policies in Supabase dashboard later

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Update timestamp trigger function (Supabase compatible)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (you can configure policies in Supabase dashboard)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Optional: Create a basic policy for authenticated users (adjust as needed)
-- You can modify these policies in the Supabase dashboard
CREATE POLICY "Enable read access for all users" ON orders FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON orders FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON order_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON order_items FOR INSERT WITH CHECK (true);
