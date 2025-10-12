import dotenv from 'dotenv';
import { HyperliquidTradingAPI } from './api/hyperliquidTradingApi';
import { MockTradingAPI } from './mocks/tradingApi';

dotenv.config();

/**
 * Example script demonstrating Hyperliquid trading API usage
 * This script shows how to:
 * 1. Initialize the trading API
 * 2. Place orders
 * 3. Close specific orders
 * 4. Close all orders
 */
async function main() {
  console.log('=== Hyperliquid Trading API Example ===\n');

  // Check if using real Hyperliquid or mock
  const useHyperliquid = process.env.TRADING_API_TYPE === 'hyperliquid';

  let tradingAPI;

  if (useHyperliquid) {
    console.log('Using Hyperliquid Trading API');

    const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
    if (!privateKey) {
      console.error('Error: HYPERLIQUID_PRIVATE_KEY is required');
      console.log('Please set it in your .env file');
      process.exit(1);
    }

    const testnet = process.env.HYPERLIQUID_TESTNET !== 'false';
    const walletAddress = process.env.HYPERLIQUID_WALLET_ADDRESS;

    console.log(`Configuration:`);
    console.log(`  - Network: ${testnet ? 'Testnet' : 'Mainnet'}`);
    console.log(`  - Wallet: ${walletAddress || 'Derived from private key'}\n`);

    tradingAPI = new HyperliquidTradingAPI(privateKey, testnet, walletAddress);
  } else {
    console.log('Using Mock Trading API (for testing)\n');
    tradingAPI = new MockTradingAPI();
  }

  try {
    // Example 1: Place a long order
    console.log('Example 1: Placing a long order');
    const orderId1 = await tradingAPI.executeLongOrder('BTC', 50000, 'ExampleStrategy');
    console.log(`Order placed successfully. Order ID: ${orderId1}\n`);

    // Example 2: Place another order
    console.log('Example 2: Placing another order');
    const orderId2 = await tradingAPI.executeLongOrder('ETH', 3000, 'ExampleStrategy');
    console.log(`Order placed successfully. Order ID: ${orderId2}\n`);

    // Example 3: Close a specific order
    console.log('Example 3: Closing a specific order');
    await tradingAPI.closeOrder(orderId1, 51000);
    console.log(`Order ${orderId1} closed successfully\n`);

    // Example 4: Close all remaining orders
    console.log('Example 4: Closing all remaining orders');
    await tradingAPI.closeAllOrders();
    console.log('All orders closed successfully\n');

    console.log('=== Examples completed successfully ===');
  } catch (error) {
    console.error('Error occurred:', error);
    process.exit(1);
  }
}

// Run if this is the main module (Node.js compatibility)
// This allows the script to be both imported and executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
