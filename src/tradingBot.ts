import dotenv from 'dotenv';
import { TradingBotService } from './services/tradingBot';
import { DefaultTradingStrategy, AggressiveTradingStrategy } from './strategies/implementations';
import { ITradingAPI } from './interfaces/ITradingAPI';
import { MockTradingAPI } from './mocks/tradingApi';
import { HyperliquidTradingAPI } from './api/hyperliquidTradingApi';

dotenv.config();

/**
 * Get the appropriate trading API based on environment configuration
 */
function getTradingAPI(): ITradingAPI {
  const apiType = process.env.TRADING_API_TYPE || 'mock';

  switch (apiType.toLowerCase()) {
    case 'hyperliquid': {
      console.log('[TradingBot] Using Hyperliquid Trading API');
      const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('HYPERLIQUID_PRIVATE_KEY is required when TRADING_API_TYPE=hyperliquid');
      }
      const testnet = process.env.HYPERLIQUID_TESTNET !== 'false';
      const walletAddress = process.env.HYPERLIQUID_WALLET_ADDRESS;
      const vaultAddress = process.env.HYPERLIQUID_VAULT_ADDRESS;

      console.log(
        `[TradingBot] Hyperliquid config: testnet=${testnet}, walletAddress=${walletAddress || 'derived from key'}`
      );
      return new HyperliquidTradingAPI(privateKey, testnet, walletAddress, vaultAddress);
    }

    case 'mock':
    default:
      console.log('[TradingBot] Using Mock Trading API');
      return new MockTradingAPI();
  }
}

/**
 * Trading Bot Script
 * Monitors prices and executes automated trades based on strategies
 */
async function main() {
  console.log('=== Crypto Trading Bot ===');

  const symbols = ['BTC', 'ETH', 'XRP'];
  const intervalMs = parseInt(process.env.RECOVERY_CHECK_INTERVAL_MS || '10000');
  const crashThreshold = parseFloat(process.env.CRASH_THRESHOLD_PERCENTAGE || '20');

  // Get the configured trading API
  const tradingAPI = getTradingAPI();
  const tradingBot = new TradingBotService(tradingAPI);

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
