#!/bin/bash

echo "🚀 Recipe App Quick Start with Indian Recipes"
echo "=============================================="
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    if command_exists netstat; then
        netstat -tulpn 2>/dev/null | grep ":$1 " >/dev/null
    elif command_exists ss; then
        ss -tulpn | grep ":$1 " >/dev/null
    else
        # Fallback: try to connect
        (echo >/dev/tcp/localhost/$1) >/dev/null 2>&1
    fi
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js is available"

if ! command_exists docker; then
    echo "❌ Docker is not installed"
    echo "   Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi
echo "✅ Docker is available"

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi
echo "✅ Running from correct directory"

# Start DynamoDB Local if not running
echo ""
echo "🗄️ Setting up DynamoDB Local..."

if port_in_use 8000; then
    echo "✅ Something is running on port 8000 (likely DynamoDB Local)"
else
    echo "🚀 Starting DynamoDB Local..."
    if [ -f "docker-compose.yml" ]; then
        docker compose up -d dynamodb-local
        echo "⏳ Waiting for DynamoDB Local to start..."
        sleep 5
        
        if port_in_use 8000; then
            echo "✅ DynamoDB Local is now running"
        else
            echo "❌ Failed to start DynamoDB Local"
            echo "   Try manually: docker compose up -d dynamodb-local"
            exit 1
        fi
    else
        echo "❌ docker-compose.yml not found"
        echo "   Try manually: docker run -d -p 8000:8000 amazon/dynamodb-local"
        exit 1
    fi
fi

# Test DynamoDB accessibility
echo ""
echo "🔗 Testing DynamoDB connection..."
if curl -s http://localhost:8000 >/dev/null 2>&1; then
    echo "✅ DynamoDB Local is accessible"
else
    echo "❌ DynamoDB Local is not accessible"
    echo "   This might be a Docker networking issue"
    echo "   Try: docker ps | grep dynamodb"
    exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
cd server
if [ ! -d "node_modules" ]; then
    echo "   Installing server dependencies..."
    npm install
fi
cd ..

cd client
if [ ! -d "node_modules" ]; then
    echo "   Installing client dependencies..."
    npm install
fi
cd ..

echo "✅ Dependencies installed"

# Initialize database
echo ""
echo "🏗️ Initializing database..."
cd server
node config/init-dynamodb.js
cd ..

# Import Indian recipes
echo ""
echo "🇮🇳 Importing Indian recipes..."
cd server
node scripts/import-indian-recipes.js
cd ..

# Validate setup
echo ""
echo "✅ Validating setup..."
cd server
node validate-setup.js
cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "🚀 To start the application:"
echo "   Terminal 1: cd server && npm start"
echo "   Terminal 2: cd client && npm start"
echo ""
echo "🌐 Then visit: http://localhost:3000"
echo "📅 Try the meal planner: http://localhost:3000/meal-planner"
echo ""
echo "✨ Enjoy planning meals with Indian recipes!"