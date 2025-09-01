# KK Beauty - Supabase Database Setup

This guide explains how to set up PostgreSQL database storage for order management using Supabase.

## 🚀 Supabase Deployment Steps

### 1. **Create Supabase Project**
1. Go to [supabase.com](https://supabase.com)
2. Sign up/login with GitHub
3. Click "New Project"
4. Choose your organization and enter project details:
   - **Name**: `kk-beauty-backend`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
5. Wait for project to be created (~2 minutes)

### 2. **Get Database Connection Details**
1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Copy the following information:
   - **Connection string** (URI format)
   - **Project URL**
   - **Project API Keys** (anon and service_role)

### 3. **Set Environment Variables**
Copy `supabase.env.example` to `.env` and fill in your values:

```bash
# Copy the example file
cp supabase.env.example .env
```

Update `.env` with your Supabase credentials:
```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-domain.com
```

### 4. **Initialize Database Schema**
Run the SQL commands from `database/supabase-schema.sql`:

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase project → **SQL Editor**
2. Copy and paste the contents from `database/supabase-schema.sql`
3. Click "Run" to execute the schema

**Option B: Using psql command line**
```bash
psql $DATABASE_URL -f database/supabase-schema.sql
```

### 5. **Configure Row Level Security (Optional)**
1. In Supabase dashboard → **Authentication** → **Policies**
2. Review and modify the default policies created by the schema
3. Adjust policies based on your security requirements

### 6. **Deploy Backend**
You can deploy your backend to various platforms:

**Vercel (Recommended):**
```bash
npm install -g vercel
vercel --prod
```

**Railway:**
1. Connect your GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

**Render/Heroku:**
- Follow their deployment guides
- Set environment variables in their dashboard

## 📊 Database Schema

### Orders Table
```sql
orders (
  id, order_id, stripe_payment_intent_id, customer_name, 
  customer_email, customer_address, subtotal, tax_amount, 
  total_amount, payment_status, order_status, created_at
)
```

### Order Items Table
```sql
order_items (
  id, order_id, product_id, product_name, 
  product_price, quantity, total_price
)
```

## 🔗 API Endpoints

### Customer Endpoints
- `POST /api/create-payment-intent` - Create Stripe payment intent
- `POST /api/payment-success` - Process successful payment & save order
- `GET /api/orders/:orderId` - Get order details by order ID

### Admin Endpoints
- `GET /api/admin/orders?limit=10` - Get recent orders
- `PUT /api/admin/orders/:orderId/status` - Update order status

### Health Check
- `GET /api/health` - Server and database status

## 🔄 Order Flow

1. **Customer makes payment** → Frontend calls `/api/create-payment-intent`
2. **Payment succeeds** → Frontend calls `/api/payment-success`
3. **Backend verifies payment** with Stripe → Saves order to PostgreSQL
4. **Order stored** with all details: customer info, items, totals, timestamp
5. **Customer receives** order confirmation with order ID

## 📈 What Gets Stored

For each successful payment:
- ✅ **Order Details**: ID, payment intent, totals, status
- ✅ **Customer Info**: Name, email, address, city, country
- ✅ **Items Purchased**: Product names, prices, quantities
- ✅ **Financial Data**: Subtotal, tax amount, total paid
- ✅ **Timestamps**: Order creation and last update times
- ✅ **Payment Status**: Stripe payment confirmation

## 🛠️ Local Development

1. **Install dependencies:**
   ```bash
   cd kk-beauty-1
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Copy the example file
   cp supabase.env.example .env
   
   # Update .env with your Supabase credentials
   # You can use your Supabase project for local development
   # or set up a separate "Development" project in Supabase
   ```

3. **Initialize database (if using separate dev project):**
   ```bash
   # Run schema on your development database
   psql $DATABASE_URL -f database/supabase-schema.sql
   ```

4. **Start server:**
   ```bash
   npm run dev
   ```

**Pro Tip:** Create separate Supabase projects for development and production to avoid conflicts.

## 🔍 Testing the Database

After deployment, test your endpoints:

```bash
# Check health
curl https://your-backend-domain.com/api/health

# Get recent orders (after some payments)
curl https://your-backend-domain.com/api/admin/orders

# Get specific order
curl https://your-backend-domain.com/api/orders/KK-123456
```

## 🎯 Next Steps

After database is working:
- 📧 Add email notifications (SendGrid, Nodemailer)
- 📦 Integrate shipping APIs (ShipStation, EasyPost)
- 📊 Build admin dashboard for order management
- 🔔 Set up Stripe webhooks for payment updates
- 📈 Add analytics and reporting features
- 🔐 Implement Supabase Auth for admin features
- 📊 Use Supabase Dashboard for real-time data monitoring

## 🌟 Supabase Benefits

Your KK Beauty app now benefits from:
- ✅ **Managed PostgreSQL** - No server maintenance
- ✅ **Real-time subscriptions** - Live order updates
- ✅ **Built-in Auth** - Ready for admin features
- ✅ **Auto-scaling** - Handles traffic spikes
- ✅ **Dashboard** - Visual database management
- ✅ **Edge Functions** - Serverless API endpoints
- ✅ **Storage** - For product images (if needed)

Your orders are now permanently stored and can be tracked, managed, and analyzed! 🎉
