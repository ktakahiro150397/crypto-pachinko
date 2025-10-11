#!/bin/bash

# Example script demonstrating the crypto-pachinko system
# This script shows how to use the price collector and trading bot

echo "=== Crypto Pachinko Example ==="
echo ""
echo "This example demonstrates the cryptocurrency tracking and trading system."
echo ""

# Step 1: Test database connection
echo "Step 1: Testing database connection..."
npm start

echo ""
echo "---"
echo ""

# Step 2: Start price collector (with historical data)
echo "Step 2: To start the price collector with historical data:"
echo "  npm run price-collector -- --historical"
echo ""
echo "Or for real-time only:"
echo "  npm run price-collector"
echo ""

# Step 3: Start trading bot
echo "Step 3: In a separate terminal, start the trading bot:"
echo "  npm run trading-bot"
echo ""

# Step 4: Monitor
echo "Step 4: Watch the console output to see:"
echo "  - Price collection in real-time"
echo "  - Crash detection when prices drop significantly"
echo "  - Recovery detection and automatic long orders"
echo ""

echo "Note: The system uses mock APIs for demonstration."
echo "To integrate with real cryptocurrency exchanges, replace the mock APIs in:"
echo "  - src/mocks/priceApi.ts"
echo "  - src/mocks/tradingApi.ts"
