# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Install security updates and dependencies
RUN apk update && apk upgrade && apk add --no-cache \
    bash \
    curl \
    && rm -rf /var/cache/apk/*

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY ./package.json ./
COPY ./package-lock.json ./
# If you use yarn, uncomment the next line and comment out the npm ci line
# COPY yarn.lock ./

# Install only production dependencies
# If you use yarn, use: RUN yarn install --production --frozen-lockfile
RUN npm ci --only=production && npm cache clean --force

# Copy wait-for-it.sh script and make it executable
COPY wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

# Copy the rest of the application code into the container
COPY . .

# Create uploads directory and set permissions
RUN mkdir -p uploads/recipe_images && \
    chown -R nodejs:nodejs /usr/src/app

# Switch to non-root user
USER nodejs

# Make port 3001 available to the world outside this container
# This should match the port your Express app listens on (process.env.PORT || 3001)
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/healthz || exit 1

# Define the command to run your app using CMD
# This will use the "start" script from your package.json if it's `node index.js`
# If your start script is `nodemon index.js`, for production you might want `node index.js` directly
# For now, assuming `node index.js` is the target for production.
# If you want to use nodemon (not typical for prod), ensure it's in dependencies, not devDependencies.
CMD [ "node", "index.js" ]
