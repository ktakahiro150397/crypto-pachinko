import { PriceRepository } from '../database/repositories';
import { MockPriceAPI } from '../mocks/priceApi';
import { CryptoPrice } from '../types';
import { IPriceAPI } from '../interfaces/IPriceAPI';
import { IHistoricalDataProvider } from '../interfaces/IHistoricalDataProvider';
import { MockHistoricalDataProvider } from '../providers/mockHistoricalDataProvider';

/**
 * Service for collecting and storing cryptocurrency prices
 */
export class PriceCollectorService {
  private priceRepo: PriceRepository;
  private priceAPI: IPriceAPI;
  private historicalProvider: IHistoricalDataProvider;
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  constructor(priceAPI?: IPriceAPI, historicalProvider?: IHistoricalDataProvider) {
    this.priceRepo = new PriceRepository();
    this.priceAPI = priceAPI || new MockPriceAPI();
    this.historicalProvider = historicalProvider || new MockHistoricalDataProvider();
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
          source: this.priceAPI.getSourceName ? this.priceAPI.getSourceName() : 'unknown',
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
   * Insert historical price data in batch using the configured provider
   */
  async insertHistoricalData(symbol: string, startDate: Date, endDate: Date): Promise<void> {
    console.log(
      `[PriceCollector] Loading historical data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    // Load data from the provider (CSV, API, or mock)
    const prices = await this.historicalProvider.loadHistoricalData(symbol, startDate, endDate);

    if (prices.length === 0) {
      console.log(`[PriceCollector] No data to insert for ${symbol}`);
      return;
    }

    // Bulk insert in batches of 1000
    const batchSize = 1000;
    for (let i = 0; i < prices.length; i += batchSize) {
      const batch = prices.slice(i, i + batchSize);
      await this.priceRepo.insertPrices(batch);
      console.log(
        `[PriceCollector] Inserted ${batch.length} records (${i + batch.length}/${prices.length})`
      );
    }

    console.log(
      `[PriceCollector] Historical data insertion complete: ${prices.length} total records`
    );
  }

  /**
   * Get the price API instance (for testing/simulation)
   */
  getPriceAPI(): IPriceAPI {
    return this.priceAPI;
  }
}
