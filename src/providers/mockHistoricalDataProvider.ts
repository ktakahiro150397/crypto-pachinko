import { IHistoricalDataProvider } from '../interfaces/IHistoricalDataProvider';
import { CryptoPrice } from '../types';

/**
 * Mock historical data provider
 * Generates synthetic historical price data for testing
 */
export class MockHistoricalDataProvider implements IHistoricalDataProvider {
  private basePrices: Map<string, number> = new Map([
    ['BTC', 50000],
    ['ETH', 3000],
    ['XRP', 1.5],
  ]);

  /**
   * Generate mock historical data
   */
  async loadHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date,
    intervalMinutes: number = 60
  ): Promise<CryptoPrice[]> {
    console.log(
      `[MockHistoricalDataProvider] Generating data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    const prices: CryptoPrice[] = [];
    let currentDate = new Date(startDate);
    const basePrice = this.basePrices.get(symbol) || 1000;

    while (currentDate <= endDate) {
      // Simulate price variation
      const variation = (Math.random() - 0.5) * 10; // -5% to +5%
      const price = basePrice * (1 + variation / 100);

      prices.push({
        symbol,
        price,
        timestamp: new Date(currentDate),
        source: 'mock',
      });

      // Move to next interval
      currentDate = new Date(currentDate.getTime() + intervalMinutes * 60 * 1000);
    }

    console.log(`[MockHistoricalDataProvider] Generated ${prices.length} records for ${symbol}`);
    return prices;
  }

  /**
   * Set base price for a symbol
   */
  setBasePrice(symbol: string, price: number): void {
    this.basePrices.set(symbol, price);
  }

  /**
   * Get base price for a symbol
   */
  getBasePrice(symbol: string): number {
    return this.basePrices.get(symbol) || 1000;
  }
}
