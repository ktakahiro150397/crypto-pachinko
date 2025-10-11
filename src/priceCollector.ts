import dotenv from 'dotenv';
import { PriceCollectorService } from './services/priceCollector';

dotenv.config();

/**
 * Price Collector Script
 * Collects and stores cryptocurrency prices in real-time
 */
async function main() {
  console.log('=== Crypto Price Collector ===');

  const symbols = ['BTC', 'ETH', 'XRP'];
  const intervalMs = parseInt(process.env.PRICE_COLLECTION_INTERVAL_MS || '5000');

  const priceCollector = new PriceCollectorService();

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
