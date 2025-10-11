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
    // Keep only last 50 prices for crash detection
    if (recentPrices.length > 50) {
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
      await this.checkForCrash(symbol, currentPrice, strategy, recentPrices);
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
    // Keep only last 50 prices for crash detection
    if (recentPrices.length > 50) {
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
      await this.checkForCrash(symbol, currentPrice, strategy, recentPrices);
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
    recentPrices: CryptoPrice[]
  ): Promise<void> {
    // Need enough price data for crash detection
    if (recentPrices.length < 4) {
      return;
    }

    const isCrash = strategy.crashDetection.isCrash(recentPrices);

    if (isCrash) {
      // Calculate drop percentage for logging
      const startPrice = recentPrices[recentPrices.length - 4].price; // 3 drops = 4 prices
      const endPrice = currentPrice.price;
      const dropPercentage = ((startPrice - endPrice) / startPrice) * 100;

      console.log(
        `[TradingBot] CRASH DETECTED for ${symbol}: ${dropPercentage.toFixed(2)}% drop (${startPrice.toFixed(2)} -> ${endPrice.toFixed(2)})`
      );

      // Record crash event
      await this.crashEventRepo.insertCrashEvent({
        symbol,
        detectedTimestamp: new Date(),
        previousDayPrice: startPrice,
        currentPrice: endPrice,
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
   * Check stop loss and take profit conditions for open orders
   */
  private async checkStopLossAndTakeProfit(
    symbol: string,
    currentPrice: CryptoPrice,
    strategy: ITradingStrategy
  ): Promise<void> {
    const openOrders = await this.orderRepo.getOpenOrders(symbol);

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
        order.exitTimestamp = currentPrice.timestamp; // Use price data timestamp
        order.status = 'CLOSED';
        order.profitLoss = currentPrice.price - order.entryPrice;

        await this.orderRepo.updateOrder(order);

        console.log(
          `[TradingBot] Closed order ${order.id} for ${symbol} (${closeReason}) with P/L: ${order.profitLoss.toFixed(2)}`
        );
      }
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
