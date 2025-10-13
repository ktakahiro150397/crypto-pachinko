import dotenv from 'dotenv';
import { BacktestService } from './services/backtest';
import { DefaultTradingStrategy } from './strategies/implementations';

dotenv.config();

/**
 * Backtest Script
 * Tests trading strategies on historical data
 */
async function main() {
  console.log('=== Crypto Trading Backtest ===');

  // Parse command line arguments for date range
  const args = process.argv.slice(2);
  console.log('Command line arguments:', args); // Debug: Check arguments
  let startDate: Date;
  let endDate: Date;

  if (args.length >= 2) {
    // Format: npm run backtest -- 2025-10-01 2025-10-11
    startDate = new Date(args[0]);
    endDate = new Date(args[1]);
  } else {
    // Default: last 7 days
    endDate = new Date();
    startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  console.log(`Backtest period: ${startDate.toISOString()} to ${endDate.toISOString()}`);
  console.log(''); // Add breakpoint here to debug date range

  // Create backtest service
  const backtest = new BacktestService(startDate, endDate);
  console.log('BacktestService created'); // Debug: Service creation

  // Register trading strategies
  const symbols = ['BTC']; // Focus on BTC only for testing
  const crashThreshold = parseFloat(process.env.CRASH_THRESHOLD_PERCENTAGE || '2');

  for (const symbol of symbols) {
    // crashThreshold=2%, recoveryIncreases=2, stopLoss=3%, takeProfit=5%
    backtest.registerStrategy(symbol, new DefaultTradingStrategy(crashThreshold, 2, 3, 5));
  }

  // Run backtest
  try {
    await backtest.runBacktest();

    // Exit with success
    process.exit(0);
  } catch (error) {
    console.error('Backtest failed:', error);
    process.exit(1);
  }
}

main();
