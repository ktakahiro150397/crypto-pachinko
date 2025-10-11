import { IPriceAPI } from '../interfaces/IPriceAPI';

/**
 * Mock price API service
 * Simulates real-time cryptocurrency price data
 */
export class MockPriceAPI implements IPriceAPI {
  private basePrices: Map<string, number> = new Map([
    ['BTC', 50000],
    ['ETH', 3000],
    ['XRP', 1.5],
  ]);

  private lastPrices: Map<string, number> = new Map();

  /**
   * Get current price for a cryptocurrency
   * Simulates price fluctuations
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    const basePrice = this.basePrices.get(symbol) || 1000;
    const lastPrice = this.lastPrices.get(symbol) || basePrice;

    // Simulate price movement: random walk with -2% to +2% change
    const changePercent = (Math.random() - 0.5) * 4;
    const newPrice = lastPrice * (1 + changePercent / 100);

    this.lastPrices.set(symbol, newPrice);
    return newPrice;
  }

  /**
   * Simulate a price crash for testing
   */
  simulateCrash(symbol: string, dropPercentage: number): void {
    const currentPrice = this.lastPrices.get(symbol) || this.basePrices.get(symbol) || 1000;
    const crashedPrice = currentPrice * (1 - dropPercentage / 100);
    this.lastPrices.set(symbol, crashedPrice);
  }

  /**
   * Reset price to base value
   */
  resetPrice(symbol: string): void {
    this.lastPrices.delete(symbol);
  }

  /**
   * Set base price for a symbol
   */
  setBasePrice(symbol: string, price: number): void {
    this.basePrices.set(symbol, price);
    this.lastPrices.set(symbol, price);
  }

  /**
   * Get base price for a symbol
   */
  getBasePrice(symbol: string): number {
    return this.basePrices.get(symbol) || 1000;
  }
}
