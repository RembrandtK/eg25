#!/bin/bash

# Start ngrok with static domain for World App testing
# This script starts ngrok with your configured static domain

echo "🚀 Starting ngrok with static domain for World App testing..."
echo "============================================================"

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Please install it first:"
    echo "   brew install ngrok  # macOS"
    echo "   # or download from https://ngrok.com/download"
    exit 1
fi

# Check if port 3001 is in use (Next.js server should be running)
if ! lsof -i :3001 &> /dev/null; then
    echo "⚠️  Port 3001 is not in use. Make sure Next.js server is running:"
    echo "   cd app/my-app && pnpm dev"
    echo ""
    echo "Starting anyway in case server starts later..."
fi

# Get the static domain from environment or use default
STATIC_DOMAIN=${NGROK_STATIC_DOMAIN:-"pet-jackal-crucial.ngrok-free.app"}

echo "📡 Configuration:"
echo "   Local server: http://localhost:3001"
echo "   Static domain: https://${STATIC_DOMAIN}"
echo "   ngrok web UI: http://127.0.0.1:4040"
echo ""

# Start ngrok with static domain
echo "🔗 Starting ngrok tunnel..."
ngrok http --domain=${STATIC_DOMAIN} 3001

# Note: This will block until ngrok is stopped with Ctrl+C
