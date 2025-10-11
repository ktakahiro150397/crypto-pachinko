import { TradingOrder } from '../types';

/**
 * Mock trading API service
 * Simulates order execution without actual trading
 */
export class MockTradingAPI {
  private orders: Map<number, TradingOrder> = new Map();
  private nextOrderId = 1;

  /**
   * Execute a long order
   */
  async executeLongOrder(symbol: string, price: number, strategy: string): Promise<number> {
    const order: TradingOrder = {
      id: this.nextOrderId++,
      symbol,
      orderType: 'LONG',
      entryPrice: price,
      entryTimestamp: new Date(),
      status: 'OPEN',
      strategy,
    };

    this.orders.set(order.id!, order);
    console.log(`[MockTradingAPI] Long order executed: ${JSON.stringify(order)}`);
    return order.id!;
  }

  /**
   * Close an order
   */
  async closeOrder(orderId: number, exitPrice: number): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    order.exitPrice = exitPrice;
    order.exitTimestamp = new Date();
    order.status = 'CLOSED';
    order.profitLoss = exitPrice - order.entryPrice;

    console.log(`[MockTradingAPI] Order closed: ${JSON.stringify(order)}`);
  }

  /**
   * Get order details
   */
  getOrder(orderId: number): TradingOrder | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Get all orders
   */
  getAllOrders(): TradingOrder[] {
    return Array.from(this.orders.values());
  }

  /**
   * Get open orders for a symbol
   */
  getOpenOrders(symbol: string): TradingOrder[] {
    return Array.from(this.orders.values()).filter(
      (order) => order.symbol === symbol && order.status === 'OPEN'
    );
  }
}
