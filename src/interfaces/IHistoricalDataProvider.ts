import { CryptoPrice } from '../types';

/**
 * Interface for historical price data providers
 * Implement this interface to load historical data from various sources (CSV, API, etc.)
 */
export interface IHistoricalDataProvider {
  /**
   * Load historical price data for a symbol within a time range
   * @param symbol - Cryptocurrency symbol (e.g., 'BTC', 'ETH')
   * @param startDate - Start date for historical data
   * @param endDate - End date for historical data
   * @returns Promise<CryptoPrice[]> - Array of historical prices
   */
  loadHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<CryptoPrice[]>;
}
