/**
 * Interface for cryptocurrency price data providers
 * Implement this interface to integrate with real exchange APIs (Binance, Coinbase, etc.)
 */
export interface IPriceAPI {
  /**
   * Get current price for a cryptocurrency
   * @param symbol - Cryptocurrency symbol (e.g., 'BTC', 'ETH')
   * @returns Promise<number> - Current price
   */
  getCurrentPrice(symbol: string): Promise<number>;

  /**
   * Get base price for a symbol (optional, used for historical data generation)
   * @param symbol - Cryptocurrency symbol
   * @returns number - Base price
   */
  getBasePrice?(symbol: string): number;
}
