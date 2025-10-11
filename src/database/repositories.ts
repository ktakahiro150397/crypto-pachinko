import { Database } from './connection';
import { CryptoPrice, TradingOrder, CrashEvent } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class PriceRepository {
  private db = Database.getInstance();

  /**
   * 時間のミリ秒を切り捨てるヘルパー関数
   */
  private truncateMilliseconds(date: Date): Date {
    const truncated = new Date(date);
    truncated.setMilliseconds(0);
    return truncated;
  }

  async insertPrice(price: CryptoPrice): Promise<number> {
    const truncatedTimestamp = this.truncateMilliseconds(price.timestamp);
    
    const query = `
      INSERT INTO crypto_prices (symbol, price, timestamp, source)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        price = VALUES(price),
        source = VALUES(source)
    `;
    const [result] = await this.db.getPool().execute<ResultSetHeader>(query, [
      price.symbol,
      price.price,
      truncatedTimestamp,
      price.source,
    ]);
    return result.insertId;
  }

  async insertPrices(prices: CryptoPrice[]): Promise<void> {
    if (prices.length === 0) return;

    const query = `
      INSERT INTO crypto_prices (symbol, price, timestamp, source)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        price = VALUES(price),
        source = VALUES(source)
    `;
    const values = prices.map((p) => [
      p.symbol, 
      p.price, 
      this.truncateMilliseconds(p.timestamp), 
      p.source
    ]);
    await this.db.getPool().query(query, [values]);
  }

  async getLatestPrice(symbol: string): Promise<CryptoPrice | null> {
    const query = `
      SELECT symbol, price, timestamp, source
      FROM crypto_prices
      WHERE symbol = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    const [rows] = await this.db.getPool().execute<RowDataPacket[]>(query, [symbol]);
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      symbol: row.symbol,
      price: parseFloat(row.price),
      timestamp: new Date(row.timestamp),
      source: row.source,
    };
  }

  async getPricesByTimeRange(
    symbol: string,
    startTime: Date,
    endTime: Date
  ): Promise<CryptoPrice[]> {
    const query = `
      SELECT symbol, price, timestamp, source
      FROM crypto_prices
      WHERE symbol = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `;
    const [rows] = await this.db.getPool().execute<RowDataPacket[]>(query, [
      symbol,
      startTime,
      endTime,
    ]);

    return rows.map((row) => ({
      symbol: row.symbol,
      price: parseFloat(row.price),
      timestamp: new Date(row.timestamp),
      source: row.source,
    }));
  }

  async getPreviousDayPrice(symbol: string): Promise<CryptoPrice | null> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const query = `
      SELECT symbol, price, timestamp, source
      FROM crypto_prices
      WHERE symbol = ? AND timestamp <= ?
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    const [rows] = await this.db.getPool().execute<RowDataPacket[]>(query, [symbol, oneDayAgo]);
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      symbol: row.symbol,
      price: parseFloat(row.price),
      timestamp: new Date(row.timestamp),
      source: row.source,
    };
  }
}

export class OrderRepository {
  private db = Database.getInstance();

  async insertOrder(order: TradingOrder): Promise<number> {
    const query = `
      INSERT INTO trading_orders 
      (symbol, order_type, entry_price, entry_timestamp, exit_price, exit_timestamp, status, strategy, profit_loss)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await this.db.getPool().execute<ResultSetHeader>(query, [
      order.symbol,
      order.orderType,
      order.entryPrice,
      order.entryTimestamp,
      order.exitPrice || null,
      order.exitTimestamp || null,
      order.status,
      order.strategy,
      order.profitLoss || null,
    ]);
    return result.insertId;
  }

  async updateOrder(order: TradingOrder): Promise<void> {
    if (!order.id) throw new Error('Order ID is required for update');

    const query = `
      UPDATE trading_orders
      SET exit_price = ?, exit_timestamp = ?, status = ?, profit_loss = ?
      WHERE id = ?
    `;
    await this.db.getPool().execute(query, [
      order.exitPrice,
      order.exitTimestamp,
      order.status,
      order.profitLoss,
      order.id,
    ]);
  }

  async getOpenOrders(symbol: string): Promise<TradingOrder[]> {
    const query = `
      SELECT id, symbol, order_type as orderType, entry_price as entryPrice, 
             entry_timestamp as entryTimestamp, exit_price as exitPrice,
             exit_timestamp as exitTimestamp, status, strategy, profit_loss as profitLoss
      FROM trading_orders
      WHERE symbol = ? AND status = 'OPEN'
      ORDER BY entry_timestamp DESC
    `;
    const [rows] = await this.db.getPool().execute<RowDataPacket[]>(query, [symbol]);

    return rows.map((row) => ({
      id: row.id,
      symbol: row.symbol,
      orderType: row.orderType,
      entryPrice: parseFloat(row.entryPrice),
      entryTimestamp: new Date(row.entryTimestamp),
      exitPrice: row.exitPrice ? parseFloat(row.exitPrice) : undefined,
      exitTimestamp: row.exitTimestamp ? new Date(row.exitTimestamp) : undefined,
      status: row.status,
      strategy: row.strategy,
      profitLoss: row.profitLoss ? parseFloat(row.profitLoss) : undefined,
    }));
  }
}

export class CrashEventRepository {
  private db = Database.getInstance();

  async insertCrashEvent(event: CrashEvent): Promise<number> {
    const query = `
      INSERT INTO crash_events 
      (symbol, detected_timestamp, previous_day_price, current_price, drop_percentage)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        previous_day_price = VALUES(previous_day_price),
        current_price = VALUES(current_price),
        drop_percentage = VALUES(drop_percentage)
    `;
    const [result] = await this.db.getPool().execute<ResultSetHeader>(query, [
      event.symbol,
      event.detectedTimestamp,
      event.previousDayPrice,
      event.currentPrice,
      event.dropPercentage,
    ]);
    return result.insertId;
  }

  async getRecentCrashEvents(symbol: string, hours: number = 24): Promise<CrashEvent[]> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const query = `
      SELECT id, symbol, detected_timestamp as detectedTimestamp,
             previous_day_price as previousDayPrice, current_price as currentPrice,
             drop_percentage as dropPercentage
      FROM crash_events
      WHERE symbol = ? AND detected_timestamp >= ?
      ORDER BY detected_timestamp DESC
    `;
    const [rows] = await this.db.getPool().execute<RowDataPacket[]>(query, [symbol, startTime]);

    return rows.map((row) => ({
      id: row.id,
      symbol: row.symbol,
      detectedTimestamp: new Date(row.detectedTimestamp),
      previousDayPrice: parseFloat(row.previousDayPrice),
      currentPrice: parseFloat(row.currentPrice),
      dropPercentage: parseFloat(row.dropPercentage),
    }));
  }
}
