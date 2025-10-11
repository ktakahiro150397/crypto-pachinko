import { PriceRepository, OrderRepository, CrashEventRepository } from '../database/repositories';
import { MockTradingAPI } from '../mocks/tradingApi';
import { ITradingStrategy } from '../strategies/interfaces';
import { CryptoPrice, TradingOrder } from '../types';

/**
 * Trading bot service for automated cryptocurrency trading
 */
export class TradingBotService {
  private priceRepo: PriceRepository;
  private orderRepo: OrderRepository;
  private crashEventRepo: CrashEventRepository;
  private tradingAPI: MockTradingAPI;
  private strategies: Map<string, ITradingStrategy>;
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private crashStates: Map<string, boolean> = new Map();
  private recentPrices: Map<string, CryptoPrice[]> = new Map();

  constructor(tradingAPI?: MockTradingAPI) {
    this.priceRepo = new PriceRepository();
    this.orderRepo = new OrderRepository();
    this.crashEventRepo = new CrashEventRepository();
    this.tradingAPI = tradingAPI || new MockTradingAPI();
    this.strategies = new Map();
  }

  /**
   * Register a trading strategy for a symbol
   */
  registerStrategy(symbol: string, strategy: ITradingStrategy): void {
    this.strategies.set(symbol, strategy);
    console.log(`[TradingBot] Registered ${strategy.getStrategyName()} for ${symbol}`);
  }

  /**
   * Start the trading bot
   */
  async start(symbols: string[], intervalMs: number = 10000): Promise<void> {
    if (this.isRunning) {
      console.log('[TradingBot] Already running');
      return;
    }

    // Ensure all symbols have strategies
    for (const symbol of symbols) {
      if (!this.strategies.has(symbol)) {
        throw new Error(`No strategy registered for ${symbol}`);
      }
      this.recentPrices.set(symbol, []);
      this.crashStates.set(symbol, false);
    }

    this.isRunning = true;
    console.log(`[TradingBot] Starting bot for ${symbols.join(', ')}`);

    // Run immediately, then set up interval
    await this.processTradingSignals(symbols);

    this.intervalId = setInterval(async () => {
      await this.processTradingSignals(symbols);
    }, intervalMs);
  }

  /**
   * Stop the trading bot
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    console.log('[TradingBot] Stopped');
  }

  /**
   * Process trading signals for all symbols
   */
  private async processTradingSignals(symbols: string[]): Promise<void> {
    for (const symbol of symbols) {
      try {
        await this.processSymbol(symbol);
      } catch (error) {
        console.error(`[TradingBot] Error processing ${symbol}:`, error);
      }
    }
  }

  /**
   * Process trading logic for a single symbol with a specific price (for backtesting)
   */
  async processPrice(symbol: string, price: number, timestamp: Date): Promise<void> {
    const strategy = this.strategies.get(symbol);
    if (!strategy) {
      console.log(`[TradingBot] No strategy registered for ${symbol}`);
      return;
    }

    const currentPrice: CryptoPrice = {
      symbol,
      price,
      timestamp,
      source: 'backtest',
    };

    // Update recent prices
    let recentPrices = this.recentPrices.get(symbol);
    if (!recentPrices) {
      // Initialize if not exists (for backtest scenarios)
      recentPrices = [];
      this.recentPrices.set(symbol, recentPrices);
    }
    recentPrices.push(currentPrice);
    // Keep only last 10 prices
    if (recentPrices.length > 10) {
      recentPrices.shift();
    }

    let isInCrash = this.crashStates.get(symbol);
    if (isInCrash === undefined) {
      // Initialize if not exists (for backtest scenarios)
      isInCrash = false;
      this.crashStates.set(symbol, false);
    }

    if (!isInCrash) {
      // Check for crash
      await this.checkForCrash(symbol, currentPrice, strategy);
    } else {
      console.log(`[TradingBot] ${symbol} is in crash state, checking for recovery...`);
      // Check for recovery
      await this.checkForRecovery(symbol, currentPrice, strategy, recentPrices);
    }
  }

  /**
   * Process trading logic for a single symbol
   */
  private async processSymbol(symbol: string): Promise<void> {
    const strategy = this.strategies.get(symbol)!;
    const currentPrice = await this.priceRepo.getLatestPrice(symbol);

    if (!currentPrice) {
      console.log(`[TradingBot] No price data for ${symbol}`);
      return;
    }

    // Update recent prices
    let recentPrices = this.recentPrices.get(symbol);
    if (!recentPrices) {
      // Initialize if not exists (for backtest scenarios)
      recentPrices = [];
      this.recentPrices.set(symbol, recentPrices);
    }
    recentPrices.push(currentPrice);
    // Keep only last 10 prices
    if (recentPrices.length > 10) {
      recentPrices.shift();
    }

    let isInCrash = this.crashStates.get(symbol);
    if (isInCrash === undefined) {
      // Initialize if not exists (for backtest scenarios)
      isInCrash = false;
      this.crashStates.set(symbol, false);
    }

    if (!isInCrash) {
      // Check for crash
      await this.checkForCrash(symbol, currentPrice, strategy);
    } else {
      // Check for recovery
      await this.checkForRecovery(symbol, currentPrice, strategy, recentPrices);
    }
  }

  /**
   * Check if a crash has occurred
   */
  private async checkForCrash(
    symbol: string,
    currentPrice: CryptoPrice,
    strategy: ITradingStrategy
  ): Promise<void> {
    const previousDayPrice = await this.priceRepo.getPreviousDayPrice(symbol);

    if (!previousDayPrice) {
      console.log(`[TradingBot] No previous day price for ${symbol}`);
      return;
    }

    const isCrash = strategy.crashDetection.isCrash(currentPrice.price, previousDayPrice.price);

    if (isCrash) {
      const dropPercentage =
        ((previousDayPrice.price - currentPrice.price) / previousDayPrice.price) * 100;

      console.log(
        `[TradingBot] CRASH DETECTED for ${symbol}: ${dropPercentage.toFixed(2)}% drop (${previousDayPrice.price.toFixed(2)} -> ${currentPrice.price.toFixed(2)})`
      );

      // Record crash event
      await this.crashEventRepo.insertCrashEvent({
        symbol,
        detectedTimestamp: new Date(),
        previousDayPrice: previousDayPrice.price,
        currentPrice: currentPrice.price,
        dropPercentage,
      });

      // Set crash state
      this.crashStates.set(symbol, true);
    }
  }

  /**
   * Check if recovery has started and execute long order
   */
  private async checkForRecovery(
    symbol: string,
    currentPrice: CryptoPrice,
    strategy: ITradingStrategy,
    recentPrices: CryptoPrice[]
  ): Promise<void> {
    const isRecovering = strategy.recoveryDetection.isRecovering(recentPrices);

    if (isRecovering) {
      console.log(
        `[TradingBot] RECOVERY DETECTED for ${symbol} at ${currentPrice.price.toFixed(2)}`
      );

      // Execute long order
      const orderId = await this.tradingAPI.executeLongOrder(
        symbol,
        currentPrice.price,
        strategy.getStrategyName()
      );

      // Store order in database
      const order: TradingOrder = {
        symbol,
        orderType: 'LONG',
        entryPrice: currentPrice.price,
        entryTimestamp: currentPrice.timestamp, // Use price data timestamp instead of current time
        status: 'OPEN',
        strategy: strategy.getStrategyName(),
      };
      await this.orderRepo.insertOrder(order);

      console.log(`[TradingBot] Long order ${orderId} executed for ${symbol}`);

      // Reset crash state
      this.crashStates.set(symbol, false);
    }
  }

  /**
   * Close all open orders for a symbol at current price
   */
  async closeOpenOrders(symbol: string): Promise<void> {
    const openOrders = await this.orderRepo.getOpenOrders(symbol);
    const currentPrice = await this.priceRepo.getLatestPrice(symbol);

    if (!currentPrice) {
      throw new Error(`No current price for ${symbol}`);
    }

    for (const order of openOrders) {
      await this.tradingAPI.closeOrder(order.id!, currentPrice.price);

      order.exitPrice = currentPrice.price;
      order.exitTimestamp = new Date();
      order.status = 'CLOSED';
      order.profitLoss = currentPrice.price - order.entryPrice;

      await this.orderRepo.updateOrder(order);

      console.log(
        `[TradingBot] Closed order ${order.id} for ${symbol} with P/L: ${order.profitLoss.toFixed(2)}`
      );
    }
  }

  /**
   * Get the mock trading API instance (for testing/simulation)
   */
  getMockAPI(): MockTradingAPI {
    return this.tradingAPI;
  }
}
