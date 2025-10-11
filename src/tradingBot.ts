import dotenv from 'dotenv';
import { TradingBotService } from './services/tradingBot';
import { DefaultTradingStrategy, AggressiveTradingStrategy } from './strategies/implementations';

dotenv.config();

/**
 * Trading Bot Script
 * Monitors prices and executes automated trades based on strategies
 */
async function main() {
  console.log('=== Crypto Trading Bot ===');

  const symbols = ['BTC', 'ETH', 'XRP'];
  const intervalMs = parseInt(process.env.RECOVERY_CHECK_INTERVAL_MS || '10000');
  const crashThreshold = parseFloat(process.env.CRASH_THRESHOLD_PERCENTAGE || '20');

  const tradingBot = new TradingBotService();

  // Register strategies for each symbol
  // BTC and ETH use default strategy, XRP uses aggressive strategy
  tradingBot.registerStrategy('BTC', new DefaultTradingStrategy(crashThreshold));
  tradingBot.registerStrategy('ETH', new DefaultTradingStrategy(crashThreshold));
  tradingBot.registerStrategy('XRP', new AggressiveTradingStrategy());

  // Start the trading bot
  console.log(`Starting trading bot (interval: ${intervalMs}ms)`);
  await tradingBot.start(symbols, intervalMs);

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    tradingBot.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
