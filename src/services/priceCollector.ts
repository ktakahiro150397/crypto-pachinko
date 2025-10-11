import { PriceRepository } from '../database/repositories';
import { MockPriceAPI } from '../mocks/priceApi';
import { CryptoPrice } from '../types';
import { IPriceAPI } from '../interfaces/IPriceAPI';

/**
 * Service for collecting and storing cryptocurrency prices
 */
export class PriceCollectorService {
  private priceRepo: PriceRepository;
  private priceAPI: IPriceAPI;
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  constructor(priceAPI?: IPriceAPI) {
    this.priceRepo = new PriceRepository();
    this.priceAPI = priceAPI || new MockPriceAPI();
  }

  /**
   * Start real-time price collection
   */
  async startRealTimeCollection(symbols: string[], intervalMs: number = 5000): Promise<void> {
    if (this.isRunning) {
      console.log('[PriceCollector] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[PriceCollector] Starting real-time collection for ${symbols.join(', ')}`);

    // Collect immediately, then set up interval
    await this.collectPrices(symbols);

    this.intervalId = setInterval(async () => {
      await this.collectPrices(symbols);
    }, intervalMs);
  }

  /**
   * Stop real-time price collection
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    console.log('[PriceCollector] Stopped');
  }

  /**
   * Collect prices for given symbols and store them
   */
  private async collectPrices(symbols: string[]): Promise<void> {
    try {
      const prices: CryptoPrice[] = [];

      for (const symbol of symbols) {
        const price = await this.priceAPI.getCurrentPrice(symbol);
        prices.push({
          symbol,
          price,
          timestamp: new Date(),
          source: 'mock_api',
        });
      }

      // Store prices in batch
      await this.priceRepo.insertPrices(prices);

      console.log(
        `[PriceCollector] Collected prices: ${prices.map((p) => `${p.symbol}=$${p.price.toFixed(2)}`).join(', ')}`
      );
    } catch (error) {
      console.error('[PriceCollector] Error collecting prices:', error);
    }
  }

  /**
   * Insert historical price data in batch
   */
  async insertHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date,
    intervalMinutes: number = 60
  ): Promise<void> {
    console.log(
      `[PriceCollector] Inserting historical data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    const prices: CryptoPrice[] = [];
    let currentDate = new Date(startDate);
    const basePrice = this.priceAPI.getBasePrice ? this.priceAPI.getBasePrice(symbol) : 1000;

    while (currentDate <= endDate) {
      // Simulate price variation
      const variation = (Math.random() - 0.5) * 10; // -5% to +5%
      const price = basePrice * (1 + variation / 100);

      prices.push({
        symbol,
        price,
        timestamp: new Date(currentDate),
        source: 'historical_batch',
      });

      // Move to next interval
      currentDate = new Date(currentDate.getTime() + intervalMinutes * 60 * 1000);

      // Batch insert every 1000 records
      if (prices.length >= 1000) {
        await this.priceRepo.insertPrices(prices);
        console.log(`[PriceCollector] Inserted ${prices.length} historical records`);
        prices.length = 0;
      }
    }

    // Insert remaining prices
    if (prices.length > 0) {
      await this.priceRepo.insertPrices(prices);
      console.log(`[PriceCollector] Inserted ${prices.length} historical records`);
    }

    console.log('[PriceCollector] Historical data insertion complete');
  }

  /**
   * Get the price API instance (for testing/simulation)
   */
  getPriceAPI(): IPriceAPI {
    return this.priceAPI;
  }
}
