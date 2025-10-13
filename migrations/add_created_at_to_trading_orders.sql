-- Migration: Add created_at column to trading_orders table
-- This migration adds a created_at timestamp to track when orders were created in the database

ALTER TABLE trading_orders 
ADD COLUMN created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Add index for efficient querying by created_at
ALTER TABLE trading_orders 
ADD INDEX idx_created_at (created_at);

-- Update existing records to have created_at equal to entry_timestamp as a reasonable default
UPDATE trading_orders 
SET created_at = entry_timestamp 
WHERE created_at IS NULL OR created_at = '1970-01-01 00:00:00.000';