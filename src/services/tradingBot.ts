import { PriceRepository, OrderRepository, CrashEventRepository } from '../database/repositories';
import { ITradingAPI } from '../interfaces/ITradingAPI';
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
  private tradingAPI: ITradingAPI;
  private strategies: Map<string, ITradingStrategy>;
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private crashStates: Map<string, boolean> = new Map();
  private recentPrices: Map<string, CryptoPrice[]> = new Map();
  private openOrdersCache: Map<string, TradingOrder[]> = new Map();

  constructor(tradingAPI?: ITradingAPI) {
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

    // Initialize open orders cache
    await this.initializeOpenOrdersCache(symbols);

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
   * Initialize open orders cache from database
   */
  private async initializeOpenOrdersCache(symbols: string[]): Promise<void> {
    for (const symbol of symbols) {
      const openOrders = await this.orderRepo.getOpenOrders(symbol);
      this.openOrdersCache.set(symbol, openOrders);
      console.log(`[TradingBot] Loaded ${openOrders.length} open orders for ${symbol} into cache`);
    }
  }

  /**
   * Get cached open orders for a symbol
   */
  private getCachedOpenOrders(symbol: string): TradingOrder[] {
    return this.openOrdersCache.get(symbol) || [];
  }

  /**
   * Add new order to cache
   */
  private addOrderToCache(symbol: string, order: TradingOrder): void {
    const orders = this.openOrdersCache.get(symbol) || [];
    orders.push(order);
    this.openOrdersCache.set(symbol, orders);
  }

  /**
   * Remove order from cache
   */
  private removeOrderFromCache(symbol: string, orderId: number): void {
    const orders = this.openOrdersCache.get(symbol) || [];
    const filteredOrders = orders.filter((order) => order.id !== orderId);
    this.openOrdersCache.set(symbol, filteredOrders);
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
   * Process trading logic for a single symbol
   */
  private async processSymbol(symbol: string): Promise<void> {
    const currentPrice = await this.priceRepo.getLatestPrice(symbol);

    if (!currentPrice) {
      console.log(`[TradingBot] No price data for ${symbol}`);
      return;
    }

    await this.processSymbolWithPrice(symbol, currentPrice);
  }

  /**
   * Process trading logic for a single symbol with a specific price (used for backtesting)
   */
  private async processSymbolWithPrice(symbol: string, currentPrice: CryptoPrice): Promise<void> {
    const strategy = this.strategies.get(symbol)!;

    // Check for SL/TP on existing open orders first
    await this.checkStopLossAndTakeProfit(symbol, currentPrice, strategy);

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
      // Check for crash (default: 3 intervals lookback)
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
    strategy: ITradingStrategy,
    lookbackCount: number = 3
  ): Promise<void> {
    // Get recent prices from database (lookback count only, excluding current)
    const recentPrices = await this.priceRepo.getRecentPrices(
      symbol,
      lookbackCount,
      currentPrice.timestamp
    );

    if (recentPrices.length < lookbackCount) {
      console.log(
        `[TradingBot] Not enough price data for crash detection on ${symbol} (need ${lookbackCount}, have ${recentPrices.length})`
      );
      return;
    }

    // Get the oldest price in the lookback period as base price
    // recentPrices is ordered chronologically (oldest first after reverse)
    const basePrice = recentPrices[0]; // Oldest price in the lookback period

    // Debug: Show crash detection details (reduced frequency)
    if (Math.random() < 0.01) {
      // Show only 1% of the time to reduce log noise
      // console.log(
      //   `[TradingBot] Crash detection for ${symbol}: current ${currentPrice.price}@${currentPrice.timestamp.toISOString()} vs base ${basePrice.price}@${basePrice.timestamp.toISOString()}`
      // );
    }

    const isCrash = strategy.crashDetection.isCrash(currentPrice.price, basePrice.price);

    if (isCrash) {
      const dropPercentage = ((basePrice.price - currentPrice.price) / basePrice.price) * 100;

      console.log(
        `[TradingBot] CRASH DETECTED for ${symbol}: ${dropPercentage.toFixed(2)}% drop in ${lookbackCount} intervals (${basePrice.price.toFixed(2)} -> ${currentPrice.price.toFixed(2)})`
      );

      // Record crash event
      await this.crashEventRepo.insertCrashEvent({
        symbol,
        detectedTimestamp: new Date(),
        previousDayPrice: basePrice.price, // Note: This field represents the base price from lookback period (kept for DB compatibility)
        currentPrice: currentPrice.price,
        dropPercentage,
      });

      // Set crash state
      this.crashStates.set(symbol, true);
      console.log(`[Crash State] ${symbol} is now in CRASH state, will check for recovery`);
    } else {
      // // Debug log when crash is not detected (reduce frequency)
      // if (Math.random() < 0.005) {
      //   // 0.5% of the time
      //   console.log(`[Crash State] ${symbol} still monitoring for crash (not in crash state)`);
      // }
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
    console.log(
      `[Recovery Check] ${symbol} - Checking recovery with ${recentPrices.length} recent prices (current: ${currentPrice.price})`
    );

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
        id: orderId, // Use the ID from trading API
        symbol,
        orderType: 'LONG',
        entryPrice: currentPrice.price,
        entryTimestamp: new Date(),
        status: 'OPEN',
        strategy: strategy.getStrategyName(),
      };
      await this.orderRepo.insertOrder(order);

      // Add to cache
      this.addOrderToCache(symbol, order);

      console.log(
        `[TradingBot] Long order ${orderId} executed for ${symbol} with SL: ${strategy.getStopLossPercentage()}%, TP: ${strategy.getTakeProfitPercentage()}%`
      );

      // Reset crash state
      this.crashStates.set(symbol, false);
    }
  }

  /**
   * Close all open orders for a symbol at current price
   */
  async closeOpenOrders(symbol: string): Promise<void> {
    const openOrders = this.getCachedOpenOrders(symbol);
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

      // Remove from cache
      this.removeOrderFromCache(symbol, order.id!);

      console.log(
        `[TradingBot] Closed order ${order.id} for ${symbol} with P/L: ${order.profitLoss.toFixed(2)}`
      );
    }
  }

  /**
   * Get the trading API instance
   */
  getTradingAPI(): ITradingAPI {
    return this.tradingAPI;
  }

  /**
   * Close all open orders across all symbols
   */
  async closeAllOpenOrders(): Promise<void> {
    console.log('[TradingBot] Closing all open orders via trading API');
    await this.tradingAPI.closeAllOrders();
    console.log('[TradingBot] All orders closed successfully');
  }

  /**
   * Check stop loss and take profit conditions for open orders
   */
  private async checkStopLossAndTakeProfit(
    symbol: string,
    currentPrice: CryptoPrice,
    strategy: ITradingStrategy
  ): Promise<void> {
    const openOrders = this.getCachedOpenOrders(symbol);

    for (const order of openOrders) {
      let shouldClose = false;
      let closeReason = '';

      // Check stop loss
      if (strategy.shouldTriggerStopLoss(order.entryPrice, currentPrice.price)) {
        shouldClose = true;
        closeReason = 'STOP_LOSS';
        const lossPercentage = ((order.entryPrice - currentPrice.price) / order.entryPrice) * 100;
        console.log(
          `[TradingBot] STOP LOSS triggered for ${symbol}: ${lossPercentage.toFixed(2)}% loss (${order.entryPrice.toFixed(2)} -> ${currentPrice.price.toFixed(2)})`
        );
      }
      // Check take profit
      else if (strategy.shouldTriggerTakeProfit(order.entryPrice, currentPrice.price)) {
        shouldClose = true;
        closeReason = 'TAKE_PROFIT';
        const gainPercentage = ((currentPrice.price - order.entryPrice) / order.entryPrice) * 100;
        console.log(
          `[TradingBot] TAKE PROFIT triggered for ${symbol}: ${gainPercentage.toFixed(2)}% gain (${order.entryPrice.toFixed(2)} -> ${currentPrice.price.toFixed(2)})`
        );
      }

      if (shouldClose) {
        // Close the order
        await this.tradingAPI.closeOrder(order.id!, currentPrice.price);

        order.exitPrice = currentPrice.price;
        order.exitTimestamp = new Date();
        order.status = 'CLOSED';
        order.profitLoss = currentPrice.price - order.entryPrice;

        await this.orderRepo.updateOrder(order);

        // Remove from cache
        this.removeOrderFromCache(symbol, order.id!);

        console.log(
          `[TradingBot] Closed order ${order.id} for ${symbol} (${closeReason}) with P/L: ${order.profitLoss.toFixed(2)}`
        );
      }
    }
  }
}
