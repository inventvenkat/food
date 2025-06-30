#!/bin/bash

echo "🇮🇳 Indian Recipes Import Script"
echo "================================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Docker is available for DynamoDB Local
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first or start DynamoDB Local manually."
    exit 1
fi

echo "🔍 Checking if DynamoDB Local is running..."

# Check if DynamoDB Local is already running
if curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo "✅ DynamoDB Local is already running"
else
    echo "🚀 Starting DynamoDB Local..."
    # Try to start DynamoDB Local using docker compose
    if [ -f "docker-compose.yml" ]; then
        docker compose up -d dynamodb-local
        echo "⏳ Waiting for DynamoDB Local to be ready..."
        sleep 5

        # Check if it's running now
        if curl -s http://localhost:8000 > /dev/null 2>&1; then
            echo "✅ DynamoDB Local is now running"
        else
            echo "❌ Failed to start DynamoDB Local. Please start it manually:"
            echo "   docker compose up -d dynamodb-local"
            exit 1
        fi
    else
        echo "❌ docker-compose.yml not found. Please start DynamoDB Local manually:"
        echo "   docker run -p 8000:8000 amazon/dynamodb-local"
        exit 1
    fi
fi

# Navigate to server directory
cd server

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔧 Initializing DynamoDB tables..."
node config/init-dynamodb.js

export AWS_REGION=us-east-1
# Run the import script
echo "🚀 Starting recipe import..."
node scripts/import-indian-recipes.js

echo "✨ Done! Check your recipe app to see the new Indian recipes."