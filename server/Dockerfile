# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY ./package.json ./
COPY ./package-lock.json ./
# If you use yarn, uncomment the next line and comment out the npm ci line
# COPY yarn.lock ./

# Install only production dependencies
# If you use yarn, use: RUN yarn install --production --frozen-lockfile
RUN npm ci --only=production

# Install bash for wait-for-it.sh
RUN apk add --no-cache bash

# Copy the rest of the application code into the container
COPY . .

# Copy wait-for-it.sh script and make it executable
COPY ./wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

# Make port 3001 available to the world outside this container
# This should match the port your Express app listens on (process.env.PORT || 3001)
EXPOSE 3001

# Define the command to run your app using CMD
# This will use the "start" script from your package.json if it's `node index.js`
# If your start script is `nodemon index.js`, for production you might want `node index.js` directly
# For now, assuming `node index.js` is the target for production.
# If you want to use nodemon (not typical for prod), ensure it's in dependencies, not devDependencies.
CMD [ "node", "index.js" ]
