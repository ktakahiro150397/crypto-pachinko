import { IPriceAPI } from '../interfaces/IPriceAPI';

/**
 * Binance API implementation for real cryptocurrency price data
 *
 * To use this implementation:
 * 1. Install axios: npm install axios
 * 2. Replace MockPriceAPI with BinancePriceAPI in your services
 *
 * Example:
 * ```typescript
 * const priceAPI = new BinancePriceAPI();
 * const priceCollector = new PriceCollectorService(priceAPI);
 * ```
 */
export class BinancePriceAPI implements IPriceAPI {
  private baseUrl = 'https://api.binance.com';

  // Symbol mapping: internal symbol -> Binance trading pair
  private symbolMap: Map<string, string> = new Map([
    ['BTC', 'BTCUSDT'],
    ['ETH', 'ETHUSDT'],
    ['XRP', 'XRPUSDT'],
  ]);

  /**
   * Get current price for a cryptocurrency from Binance
   * @param symbol - Cryptocurrency symbol (e.g., 'BTC', 'ETH')
   * @returns Promise<number> - Current price in USDT
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    const tradingPair = this.symbolMap.get(symbol) || `${symbol}USDT`;

    try {
      // Using native fetch (available in Node.js 18+)
      const response = await fetch(`${this.baseUrl}/api/v3/ticker/price?symbol=${tradingPair}`);

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as { symbol: string; price: string };
      return parseFloat(data.price);
    } catch (error) {
      console.error(`[BinancePriceAPI] Error fetching price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Optional: Get base price (not used in real implementation)
   */
  getBasePrice(symbol: string): number {
    // Return a default value - this is only used for historical data generation
    // In a real implementation, you wouldn't generate historical data this way
    const defaults: Record<string, number> = {
      BTC: 50000,
      ETH: 3000,
      XRP: 1.5,
    };
    return defaults[symbol] || 1000;
  }

  /**
   * Add a custom symbol mapping
   */
  addSymbolMapping(symbol: string, tradingPair: string): void {
    this.symbolMap.set(symbol, tradingPair);
  }

  getSourceName(): string {
    return 'binance_realtime';
  }
}
