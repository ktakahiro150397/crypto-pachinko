import dotenv from 'dotenv';
import { HyperliquidTradingAPI } from './api/hyperliquidTradingApi';

dotenv.config();

/**
 * Script to check available assets on Hyperliquid
 */
async function checkAssets() {
  console.log('=== Checking Hyperliquid Available Assets ===\n');

  const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: HYPERLIQUID_PRIVATE_KEY is required');
    process.exit(1);
  }

  const testnet = process.env.HYPERLIQUID_TESTNET !== 'false';
  const walletAddress = process.env.HYPERLIQUID_WALLET_ADDRESS;

  console.log(`Configuration:`);
  console.log(`  - Network: ${testnet ? 'Testnet' : 'Mainnet'}`);
  console.log(`  - Wallet: ${walletAddress || 'Derived from private key'}\n`);

  const tradingAPI = new HyperliquidTradingAPI(privateKey, testnet, walletAddress);

  try {
    // Get available assets
    const assets = await tradingAPI.getAvailableAssets();
    console.log('Available assets:');
    
    assets.forEach((asset, index) => {
      console.log(`  ${index}: ${asset.name} (Max Leverage: ${asset.maxLeverage}x, Size Decimals: ${asset.szDecimals})`);
    });

    // Get current market prices
    const allMids = await tradingAPI.getAllMids();
    console.log('\nCurrent market prices:');
    Object.entries(allMids).forEach(([symbol, price]) => {
      console.log(`  ${symbol}: $${price}`);
    });

  } catch (error) {
    console.error('Error checking assets:', error);
  } finally {
    tradingAPI.disconnect();
  }
}

checkAssets().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});