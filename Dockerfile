# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Set environment variable to disable ESLint during build
ENV DISABLE_ESLINT_PLUGIN=true
ENV CI=false

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
