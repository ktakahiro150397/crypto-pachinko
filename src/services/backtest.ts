import { PriceRepository } from '../database/repositories';
import { TradingBotService } from './tradingBot';
import { ITradingStrategy } from '../strategies/interfaces';

/**
 * Backtest service for testing trading strategies on historical data
 */
export class BacktestService {
  private priceRepo: PriceRepository;
  private tradingBot: TradingBotService;
  private symbols: string[];
  private startDate: Date;
  private endDate: Date;

  constructor(startDate: Date, endDate: Date) {
    this.priceRepo = new PriceRepository();
    this.tradingBot = new TradingBotService();
    this.symbols = [];
    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
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
    console.log(`Period: ${this.startDate.toISOString()} to ${this.endDate.toISOString()}`);
    console.log(`Symbols: ${this.symbols.join(', ')}`);
    console.log(`Interval: ${intervalMs}ms`);
    console.log('');

    // Initialize trading bot for backtest (without starting interval)
    await this.initializeTradingBotForBacktest();

    let totalPrices = 0;
    const startTime = Date.now();

    // Get all historical prices from DB in chronological order
    for (const symbol of this.symbols) {
      const allPrices = await this.priceRepo.getPricesByTimeRange(
        symbol,
        this.startDate,
        this.endDate
      );
      console.log(
        `[BacktestService] Found ${allPrices.length} historical prices for ${symbol} in DB`
      );

      // Process each price sequentially
      for (const priceData of allPrices) {
        // Call the trading bot with the current price (same as production)
        await this.tradingBot.processPrice(symbol, priceData.price, priceData.timestamp);

        totalPrices++;

        // Show progress every 100 iterations
        if (totalPrices % 100 === 0) {
          const progress = (totalPrices / allPrices.length) * 100;
          console.log(`Progress: ${progress.toFixed(1)}% (${totalPrices} prices processed)`);
        }
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

      // Get all orders for this symbol created during the backtest period
      const db = this.tradingBot['orderRepo']['db'];
      const query = `
        SELECT id, symbol, order_type as orderType, entry_price as entryPrice,
               entry_timestamp as entryTimestamp, exit_price as exitPrice,
               exit_timestamp as exitTimestamp, status, strategy, profit_loss as profitLoss
        FROM trading_orders
        WHERE symbol = ? 
        AND entry_timestamp >= ? 
        AND entry_timestamp <= ?
        ORDER BY entry_timestamp ASC
      `;
      const [rows] = await db.getPool().execute(query, [symbol, this.startDate, this.endDate]);

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
