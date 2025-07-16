#!/bin/bash
# start-dev.sh - Development startup script

echo "🛒 Starting HulkCart Development Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if not already installed
if [ ! -d "node_modules" ] || [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install:all
fi

# Start development servers
echo "🚀 Starting development servers..."
echo "   Server: http://localhost:3001"
echo "   Client: http://localhost:3000"
echo ""
echo "💚 HulkCart is ready to SMASH through grocery lists!"
echo ""

npm run dev
