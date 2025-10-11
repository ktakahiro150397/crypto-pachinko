import dotenv from 'dotenv';
import { PriceCollectorService } from './services/priceCollector';
import { IPriceAPI } from './interfaces/IPriceAPI';
import { MockPriceAPI } from './mocks/priceApi';
import { BinancePriceAPI } from './api/binancePriceApi';

dotenv.config();

/**
 * Get the appropriate price API based on environment configuration
 */
function getPriceAPI(): IPriceAPI {
  const apiType = process.env.PRICE_API_TYPE || 'mock';

  switch (apiType.toLowerCase()) {
    case 'binance':
      console.log('[PriceCollector] Using Binance API');
      return new BinancePriceAPI();
    
    case 'mock':
    default:
      console.log('[PriceCollector] Using Mock API');
      return new MockPriceAPI();
  }
}

/**
 * Price Collector Script with configurable API
 * Use PRICE_API_TYPE environment variable to switch between APIs
 */
async function main() {
  console.log('=== Crypto Price Collector ===');

  const symbols = ['BTC', 'ETH', 'XRP'];
  const intervalMs = parseInt(process.env.PRICE_COLLECTION_INTERVAL_MS || '5000');

  // Get the configured price API
  const priceAPI = getPriceAPI();
  const priceCollector = new PriceCollectorService(priceAPI);

  // Example: Insert historical data for the last 7 days
  if (process.argv.includes('--historical')) {
    console.log('Inserting historical data...');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    for (const symbol of symbols) {
      await priceCollector.insertHistoricalData(symbol, startDate, endDate);
    }
    console.log('Historical data insertion complete');
  }

  // Start real-time collection
  console.log(`Starting real-time price collection (interval: ${intervalMs}ms)`);
  await priceCollector.startRealTimeCollection(symbols, intervalMs);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    priceCollector.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    priceCollector.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
