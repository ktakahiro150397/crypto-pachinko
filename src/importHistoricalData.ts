import dotenv from 'dotenv';
import { PriceCollectorService } from './services/priceCollector';
import { IHistoricalDataProvider } from './interfaces/IHistoricalDataProvider';
import { MockHistoricalDataProvider } from './providers/mockHistoricalDataProvider';
// import { CsvHistoricalDataProvider } from './providers/csvHistoricalDataProvider';
import { BinanceHistoricalDataProvider } from './providers/binanceHistoricalDataProvider';
import { CsvHistoricalFromBinanceDataProvider } from './providers/csvHistoricalDataProvider';

dotenv.config();

/**
 * Get the appropriate historical data provider based on environment configuration
 */
function getHistoricalDataProvider(): IHistoricalDataProvider {
  const providerType = process.env.HISTORICAL_DATA_PROVIDER || 'mock';

  switch (providerType.toLowerCase()) {
    case 'csv': {
      console.log('[HistoricalDataImporter] Using CSV provider');
      const dataDir = process.env.CSV_DATA_DIRECTORY || './data';
      // return new CsvHistoricalDataProvider(dataDir);
      return new CsvHistoricalFromBinanceDataProvider(dataDir);
    }

    case 'binance':
      console.log('[HistoricalDataImporter] Using Binance API provider');
      return new BinanceHistoricalDataProvider();

    case 'mock':
    default:
      console.log('[HistoricalDataImporter] Using Mock provider');
      return new MockHistoricalDataProvider();
  }
}

/**
 * Historical Data Importer Script
 * Imports historical price data in bulk using configured provider
 */
async function main() {
  console.log('=== Historical Data Importer ===');

  // Configure environment variables BEFORE calling getHistoricalDataProvider
  process.env.HISTORICAL_DAYS_BACK = '365';
  process.env.HISTORICAL_DATA_PROVIDER = 'csv';
  process.env.CSV_DATA_DIRECTORY = './historical_data/btcusdt';

  const symbols = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  if (symbols.length === 0) {
    // symbols.push('BTC', 'ETH', 'XRP');
    symbols.push('BTC');
  }

  // Date range
  const endDate = new Date();
  const daysBack = parseInt(process.env.HISTORICAL_DAYS_BACK || '30');
  const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

  console.log(`Importing data for: ${symbols.join(', ')}`);
  console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
  console.log('');

  // Get the configured provider
  const historicalProvider = getHistoricalDataProvider();
  const priceCollector = new PriceCollectorService(undefined, historicalProvider);

  // Import data for each symbol
  for (const symbol of symbols) {
    try {
      await priceCollector.insertHistoricalData(symbol, startDate, endDate);
    } catch (error) {
      console.error(`Failed to import data for ${symbol}:`, error);
    }
  }

  console.log('');
  console.log('=== Import Complete ===');
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
