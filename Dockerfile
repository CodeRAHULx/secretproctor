# Production Dockerfile for Railway/Render deployment
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend dependencies
RUN npm install --prefix backend --production

# Copy backend source code
COPY backend/ ./backend/

# Copy necessary shared files
COPY .env.example ./

# Create logs directory
RUN mkdir -p backend/logs

# Expose port (Railway/Render will set PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "backend/server.js"]
