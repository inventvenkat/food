# Stage 1: Build the React application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY ./package.json ./
COPY ./package-lock.json ./
# If you use yarn, uncomment the next line and comment out the npm ci line
# COPY yarn.lock ./

# Install dependencies
# If you use yarn, use: RUN yarn install --frozen-lockfile
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:1.25-alpine

# Install security updates and dependencies
RUN apk update && apk upgrade && apk add --no-cache \
    bash \
    curl \
    && rm -rf /var/cache/apk/*

# Create a non-root user for nginx
RUN addgroup -g 101 -S nginx || true && \
    adduser -S nginx -u 101 -G nginx || true

# Copy wait-for-it.sh script and make it executable
COPY ./wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

# Copy built assets from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Expose port 80
EXPOSE 80

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/healthz || exit 1

# Switch to non-root user
USER nginx

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
