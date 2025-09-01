# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Set environment variables for build
ENV DISABLE_ESLINT_PLUGIN=true
ENV CI=false

# Stripe Configuration
ARG STRIPE_SECRET_KEY
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
ARG STRIPE_PUBLISHABLE_KEY
ENV REACT_APP_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
ARG STRIPE_WEBHOOK_SECRET
ENV STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET

# Database Configuration
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Server Configuration
ARG PORT
ENV PORT=$PORT
ENV NODE_ENV=production

# CORS Configuration
ARG FRONTEND_URL
ENV FRONTEND_URL=$FRONTEND_URL

# API URL for frontend
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build the app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built assets from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

# Default to port 3000 if not set
ENV PORT=3000

# Expose the port
EXPOSE $PORT

# Start the app
CMD ["sh", "-c", "serve -s build -l $PORT"]
