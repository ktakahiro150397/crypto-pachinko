import { PriceRepository } from '../database/repositories';
import { CryptoPrice } from '../types';

/**
 * Historical price API service
 * Returns historical price data from database for backtesting
 */
export class HistoricalPriceAPI {
  private priceRepo: PriceRepository;
  private currentTimestamp: Date;
  private priceCache: Map<string, CryptoPrice[]> = new Map();
  private currentIndex: Map<string, number> = new Map();

  constructor(startTimestamp: Date) {
    this.priceRepo = new PriceRepository();
    this.currentTimestamp = new Date(startTimestamp);
  }

  /**
   * Load historical price data for a symbol within a time range
   */
  async loadHistoricalData(
    symbol: string,
    startTime: Date,
    endTime: Date
  ): Promise<void> {
    console.log(
      `[HistoricalPriceAPI] Loading data for ${symbol} from ${startTime.toISOString()} to ${endTime.toISOString()}`
    );
    
    const prices = await this.priceRepo.getPricesByTimeRange(symbol, startTime, endTime);
    this.priceCache.set(symbol, prices);
    this.currentIndex.set(symbol, 0);
    
    console.log(`[HistoricalPriceAPI] Loaded ${prices.length} price records for ${symbol}`);
  }

  /**
   * Get current price for a cryptocurrency from historical data
   * Returns the next price in chronological order
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    const prices = this.priceCache.get(symbol);
    if (!prices || prices.length === 0) {
      throw new Error(`No historical data loaded for ${symbol}`);
    }

    const currentIdx = this.currentIndex.get(symbol) || 0;
    if (currentIdx >= prices.length) {
      // Return the last price if we've exhausted the data
      return prices[prices.length - 1].price;
    }

    const price = prices[currentIdx];
    this.currentIndex.set(symbol, currentIdx + 1);
    
    return price.price;
  }

  /**
   * Get the current timestamp in the backtest
   */
  getCurrentTimestamp(): Date {
    return new Date(this.currentTimestamp);
  }

  /**
   * Advance the backtest time
   */
  advanceTime(milliseconds: number): void {
    this.currentTimestamp = new Date(this.currentTimestamp.getTime() + milliseconds);
  }

  /**
   * Reset to a specific timestamp
   */
  setCurrentTimestamp(timestamp: Date): void {
    this.currentTimestamp = new Date(timestamp);
  }

  /**
   * Get the next price without advancing the index (peek)
   */
  async peekNextPrice(symbol: string): Promise<CryptoPrice | null> {
    const prices = this.priceCache.get(symbol);
    if (!prices || prices.length === 0) {
      return null;
    }

    const currentIdx = this.currentIndex.get(symbol) || 0;
    if (currentIdx >= prices.length) {
      return null;
    }

    return prices[currentIdx];
  }

  /**
   * Check if there's more data available
   */
  hasMoreData(symbol: string): boolean {
    const prices = this.priceCache.get(symbol);
    if (!prices || prices.length === 0) {
      return false;
    }

    const currentIdx = this.currentIndex.get(symbol) || 0;
    return currentIdx < prices.length;
  }

  /**
   * Get total number of data points
   */
  getTotalDataPoints(symbol: string): number {
    const prices = this.priceCache.get(symbol);
    return prices ? prices.length : 0;
  }

  /**
   * Get current progress (0-100)
   */
  getProgress(symbol: string): number {
    const prices = this.priceCache.get(symbol);
    if (!prices || prices.length === 0) {
      return 100;
    }

    const currentIdx = this.currentIndex.get(symbol) || 0;
    return (currentIdx / prices.length) * 100;
  }

  /**
   * Reset index to start over
   */
  reset(symbol?: string): void {
    if (symbol) {
      this.currentIndex.set(symbol, 0);
    } else {
      this.currentIndex.clear();
    }
  }

  /**
   * Get base price for a symbol (compatibility with MockPriceAPI)
   */
  getBasePrice(symbol: string): number {
    const prices = this.priceCache.get(symbol);
    if (!prices || prices.length === 0) {
      return 1000;
    }
    return prices[0].price;
  }
}
