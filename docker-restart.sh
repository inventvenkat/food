#!/bin/bash

echo "🔄 Restarting Docker containers with new AI configuration..."

# Stop containers
echo "Stopping containers..."
docker-compose down

# Rebuild server to pick up new dependencies (openai, @anthropic-ai/sdk)
echo "Rebuilding server with new AI packages..."
docker-compose build --no-cache server

# Start all containers
echo "Starting containers..."
docker-compose up -d

# Show status
echo "✅ Containers restarted! AI configuration should now be active."
echo ""
echo "🔍 Check container logs:"
echo "  docker-compose logs server"
echo ""
echo "🌐 Access the app:"
echo "  Frontend: http://localhost:3003"
echo "  Backend: http://localhost:3002"