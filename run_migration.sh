#!/bin/bash

# Migration script to add created_at column to trading_orders table
# Run this script from the project root directory

echo "Running migration: Add created_at column to trading_orders table"

# Check if docker-compose services are running
if ! docker-compose ps | grep -q "crypto-pachinko.*mysql.*Up"; then
    echo "Error: MySQL container is not running. Please start it with 'docker-compose up -d'"
    exit 1
fi

# Execute the migration SQL
docker-compose exec mysql mysql -u crypto_user -pcrypto_password crypto_trading < migrations/add_created_at_to_trading_orders.sql

if [ $? -eq 0 ]; then
    echo "Migration completed successfully!"
    echo "The trading_orders table now has a created_at column."
else
    echo "Migration failed. Please check the error messages above."
    exit 1
fi