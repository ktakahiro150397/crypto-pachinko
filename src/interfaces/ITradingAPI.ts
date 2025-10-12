/**
 * Interface for cryptocurrency trading API providers
 * Implement this interface to integrate with real exchange APIs (Hyperliquid, etc.)
 */
export interface ITradingAPI {
  /**
   * Execute a long order
   * @param symbol - Cryptocurrency symbol (e.g., 'BTC', 'ETH')
   * @param price - Entry price
   * @param strategy - Strategy name for tracking
   * @returns Promise<number> - Order ID
   */
  executeLongOrder(symbol: string, price: number, strategy: string): Promise<number>;

  /**
   * Close a specific order
   * @param orderId - Order ID to close
   * @param exitPrice - Exit price
   * @returns Promise<void>
   */
  closeOrder(orderId: number, exitPrice: number): Promise<void>;

  /**
   * Close all open orders
   * @returns Promise<void>
   */
  closeAllOrders(): Promise<void>;
}
