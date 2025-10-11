-- Database initialization script
CREATE DATABASE IF NOT EXISTS crypto_pachinko;
USE crypto_pachinko;

-- Table for storing cryptocurrency prices
CREATE TABLE IF NOT EXISTS crypto_prices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    timestamp DATETIME NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'unknown',
    UNIQUE KEY uk_symbol_timestamp (symbol, timestamp),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for storing trading orders
CREATE TABLE IF NOT EXISTS trading_orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    order_type ENUM('LONG', 'SHORT') NOT NULL,
    entry_price DECIMAL(20, 8) NOT NULL,
    entry_timestamp DATETIME(3) NOT NULL,
    exit_price DECIMAL(20, 8),
    exit_timestamp DATETIME(3),
    status ENUM('OPEN', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    strategy VARCHAR(100) NOT NULL,
    profit_loss DECIMAL(20, 8),
    INDEX idx_symbol_status (symbol, status),
    INDEX idx_entry_timestamp (entry_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for tracking crash detection events
CREATE TABLE IF NOT EXISTS crash_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    detected_timestamp DATETIME(3) NOT NULL,
    previous_day_price DECIMAL(20, 8) NOT NULL,
    current_price DECIMAL(20, 8) NOT NULL,
    drop_percentage DECIMAL(5, 2) NOT NULL,
    UNIQUE KEY uk_symbol_timestamp (symbol, detected_timestamp),
    INDEX idx_symbol_timestamp (symbol, detected_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
