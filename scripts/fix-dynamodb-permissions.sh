#!/bin/bash

# Script to fix DynamoDB Local volume permissions
# Run this if you're having permission issues with persistent DynamoDB data

echo "🔧 Fixing DynamoDB Local permissions..."

# Stop the services if running
echo "📛 Stopping services..."
docker-compose down

# Remove existing volumes
echo "🗑️  Removing existing volumes..."
docker volume rm $(docker volume ls -q | grep dynamodb) 2>/dev/null || true

# Create volume with proper permissions
echo "📁 Creating DynamoDB volume with proper permissions..."
docker volume create dynamodb-local-data

# Create a temporary container to set permissions
echo "🛠️  Setting permissions..."
docker run --rm -v dynamodb-local-data:/data alpine:latest sh -c "
    mkdir -p /data &&
    chmod 755 /data &&
    chown -R 1000:1000 /data
"

echo "✅ DynamoDB permissions fixed!"
echo "🚀 You can now run: docker-compose up"
echo ""
echo "💡 Alternative: Use in-memory DynamoDB (faster for development):"
echo "   Change the command to: [\"-jar\", \"DynamoDBLocal.jar\", \"-sharedDb\", \"-inMemory\"]"