import { PriceRepository } from '../database/repositories';
import { HistoricalPriceAPI } from '../mocks/historicalPriceApi';
import { TradingBotService } from './tradingBot';
import { ITradingStrategy } from '../strategies/interfaces';
import { CryptoPrice } from '../types';

/**
 * Backtest service for testing trading strategies on historical data
 */
export class BacktestService {
  private priceRepo: PriceRepository;
  private historicalAPI: HistoricalPriceAPI;
  private tradingBot: TradingBotService;
  private symbols: string[];
  private startDate: Date;
  private endDate: Date;
  private backtestStartTime: Date;

  constructor(startDate: Date, endDate: Date) {
    this.priceRepo = new PriceRepository();
    this.historicalAPI = new HistoricalPriceAPI(startDate);
    this.tradingBot = new TradingBotService();
    this.symbols = [];
    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
    this.backtestStartTime = new Date(); // Record when this backtest instance was created
  }

  /**
   * Register a strategy for backtesting
   */
  registerStrategy(symbol: string, strategy: ITradingStrategy): void {
    this.tradingBot.registerStrategy(symbol, strategy);
    if (!this.symbols.includes(symbol)) {
      this.symbols.push(symbol);
    }
  }

  /**
   * Run backtest on historical data
   */
  async runBacktest(intervalMs: number = 5000): Promise<BacktestResult> {
    console.log('=== Starting Backtest ===');
    console.log(`Backtest Execution Time: ${this.backtestStartTime.toISOString()}`);
    console.log(`Data Period: ${this.startDate.toISOString()} to ${this.endDate.toISOString()}`);
    console.log(`Symbols: ${this.symbols.join(', ')}`);
    console.log(`Interval: ${intervalMs}ms`);
    console.log('');

    // Display strategy settings for each symbol
    console.log('=== Strategy Settings ===');
    for (const symbol of this.symbols) {
      const strategy = this.tradingBot['strategies'].get(symbol);
      if (strategy) {
        console.log(`${symbol}:`);
        console.log(`  Strategy: ${strategy.getStrategyName()}`);
        console.log(
          `  Stop Loss: ${strategy.getStopLossPercentage() !== null ? strategy.getStopLossPercentage() + '%' : 'Disabled'}`
        );
        console.log(
          `  Take Profit: ${strategy.getTakeProfitPercentage() !== null ? strategy.getTakeProfitPercentage() + '%' : 'Disabled'}`
        );
        console.log(`  Crash Detection Threshold: ${strategy.crashDetection.getThreshold()}%`);
        console.log(`  Recovery Detection: ${strategy.recoveryDetection.getDescription()}`);
      }
    }
    console.log('');

    // Initialize trading bot for backtest (without starting interval)
    await this.initializeTradingBotForBacktest();

    // Load historical data for all symbols
    for (const symbol of this.symbols) {
      await this.historicalAPI.loadHistoricalData(symbol, this.startDate, this.endDate);
    }

    // Insert historical prices into database for the trading bot to read
    let totalPrices = 0;
    const startTime = Date.now();

    // Process data in chronological order
    while (this.historicalAPI.hasMoreData(this.symbols[0])) {
      const prices: CryptoPrice[] = [];

      // Get next price for each symbol
      for (const symbol of this.symbols) {
        if (this.historicalAPI.hasMoreData(symbol)) {
          const nextPrice = await this.historicalAPI.peekNextPrice(symbol);
          if (nextPrice) {
            // Get the price value and advance index
            const price = await this.historicalAPI.getCurrentPrice(symbol);
            const priceData = {
              symbol,
              price,
              timestamp: nextPrice.timestamp,
              source: 'backtest',
            };
            prices.push(priceData);
            totalPrices++;

            // Debug: Log first few prices to verify data progression
            if (totalPrices <= 5) {
              console.log(
                `[Backtest] Processing price #${totalPrices}: ${symbol} = ${price} @ ${nextPrice.timestamp.toISOString()}`
              );
            }
          }
        }
      }

      if (prices.length > 0) {
        // Store prices in database
        await this.priceRepo.insertPrices(prices);

        // Process trading signals with current prices
        await this.processTradingSignalsForBacktest(prices);

        // Show progress every 100 iterations
        if (totalPrices % 100 === 0) {
          const progress = this.historicalAPI.getProgress(this.symbols[0]);
          console.log(`Progress: ${progress.toFixed(1)}% (${totalPrices} prices processed)`);
        }
      } else {
        break;
      }
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('');
    console.log('=== Backtest Complete ===');
    console.log(`Total prices processed: ${totalPrices}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log('');

    // Get results
    const result = await this.getBacktestResults();
    this.printResults(result);

    return result;
  }

  /**
   * Initialize trading bot for backtest without starting the interval timer
   */
  private async initializeTradingBotForBacktest(): Promise<void> {
    // Initialize recentPrices and crashStates for all symbols
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tradingBotAny = this.tradingBot as any;

    for (const symbol of this.symbols) {
      if (!tradingBotAny.strategies.has(symbol)) {
        throw new Error(`No strategy registered for ${symbol}`);
      }
      tradingBotAny.recentPrices.set(symbol, []);
      tradingBotAny.crashStates.set(symbol, false);
    }

    console.log(`[Backtest] Initialized trading bot for ${this.symbols.join(', ')}`);
  }

  /**
   * Process trading signals without real-time delay
   */
  private async processTradingSignalsForBacktest(currentPrices: CryptoPrice[]): Promise<void> {
    // Use reflection to call private method (for backtest only)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tradingBotAny = this.tradingBot as any;
    if (tradingBotAny.processSymbolWithPrice) {
      // Process each symbol with its current price
      for (const priceData of currentPrices) {
        await tradingBotAny.processSymbolWithPrice(priceData.symbol, priceData);
      }
    }
  }

  /**
   * Get backtest results
   */
  private async getBacktestResults(): Promise<BacktestResult> {
    const result: BacktestResult = {
      symbols: this.symbols,
      startDate: this.startDate,
      endDate: this.endDate,
      trades: [],
      totalTrades: 0,
      profitableTrades: 0,
      losingTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      netProfit: 0,
      winRate: 0,
    };

    for (const symbol of this.symbols) {
      const orders = await this.tradingBot['orderRepo'].getOpenOrders(symbol);

      // Close any open orders at the end of backtest
      if (orders.length > 0) {
        await this.tradingBot.closeOpenOrders(symbol);
      }

      // Get all orders for this symbol created during this backtest execution
      const db = this.tradingBot['orderRepo']['db'];
      const query = `
        SELECT id, symbol, order_type as orderType, entry_price as entryPrice,
               entry_timestamp as entryTimestamp, exit_price as exitPrice,
               exit_timestamp as exitTimestamp, status, strategy, profit_loss as profitLoss,
               created_at as createdAt
        FROM trading_orders
        WHERE symbol = ? AND created_at >= ?
        ORDER BY entry_timestamp ASC
      `;
      const [rows] = await db
        .getPool()
        .execute(query, [symbol, this.backtestStartTime.toISOString()]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of rows as any[]) {
        const profitLoss = row.profitLoss ? parseFloat(row.profitLoss) : 0;
        result.trades.push({
          symbol: row.symbol,
          entryPrice: parseFloat(row.entryPrice),
          exitPrice: row.exitPrice ? parseFloat(row.exitPrice) : null,
          profitLoss,
          entryTime: new Date(row.entryTimestamp),
          exitTime: row.exitTimestamp ? new Date(row.exitTimestamp) : null,
          strategy: row.strategy,
        });

        result.totalTrades++;
        if (profitLoss > 0) {
          result.profitableTrades++;
          result.totalProfit += profitLoss;
        } else if (profitLoss < 0) {
          result.losingTrades++;
          result.totalLoss += Math.abs(profitLoss);
        }
        result.netProfit += profitLoss;
      }
    }

    result.winRate =
      result.totalTrades > 0 ? (result.profitableTrades / result.totalTrades) * 100 : 0;

    return result;
  }

  /**
   * Print backtest results
   */
  private printResults(result: BacktestResult): void {
    console.log('=== Backtest Results ===');
    console.log(`Total Trades: ${result.totalTrades}`);
    console.log(`Profitable Trades: ${result.profitableTrades}`);
    console.log(`Losing Trades: ${result.losingTrades}`);
    console.log(`Win Rate: ${result.winRate.toFixed(2)}%`);
    console.log(`Total Profit: $${result.totalProfit.toFixed(2)}`);
    console.log(`Total Loss: $${result.totalLoss.toFixed(2)}`);
    console.log(`Net Profit: $${result.netProfit.toFixed(2)}`);
    console.log('');

    if (result.trades.length > 0) {
      console.log('=== Trade Details ===');
      result.trades.forEach((trade, index) => {
        const status = trade.exitPrice ? 'CLOSED' : 'OPEN';
        const plStr =
          trade.profitLoss > 0
            ? `+$${trade.profitLoss.toFixed(2)}`
            : `-$${Math.abs(trade.profitLoss).toFixed(2)}`;
        console.log(
          `${index + 1}. ${trade.symbol} [${status}] Entry: $${trade.entryPrice.toFixed(2)} | ` +
            `Exit: ${trade.exitPrice ? '$' + trade.exitPrice.toFixed(2) : 'N/A'} | ` +
            `P/L: ${plStr} | Strategy: ${trade.strategy}`
        );
      });
    }
  }

  /**
   * Get the trading bot instance
   */
  getTradingBot(): TradingBotService {
    return this.tradingBot;
  }
}

/**
 * Backtest result interface
 */
export interface BacktestResult {
  symbols: string[];
  startDate: Date;
  endDate: Date;
  trades: BacktestTrade[];
  totalTrades: number;
  profitableTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  winRate: number;
}

/**
 * Backtest trade interface
 */
export interface BacktestTrade {
  symbol: string;
  entryPrice: number;
  exitPrice: number | null;
  profitLoss: number;
  entryTime: Date;
  exitTime: Date | null;
  strategy: string;
}
