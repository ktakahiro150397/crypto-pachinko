import { TradingOrder } from '../types';
import { ITradingAPI } from '../interfaces/ITradingAPI';
import { OrderRepository } from '../database/repositories';

/**
 * Mock trading API service
 * Simulates order execution without actual trading
 */
export class MockTradingAPI implements ITradingAPI {
  private orders: Map<number, TradingOrder> = new Map();
  private orderRepo = new OrderRepository();

  /**
   * Execute a long order
   */
  async executeLongOrder(symbol: string, price: number, strategy: string): Promise<number> {
    const nextId = await this.orderRepo.getNextOrderId();
    const order: TradingOrder = {
      id: nextId,
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

  /**
   * Close all open orders
   */
  async closeAllOrders(): Promise<void> {
    const openOrders = Array.from(this.orders.values()).filter((order) => order.status === 'OPEN');

    for (const order of openOrders) {
      // Use the current entry price as exit price for simulation
      // In a real scenario, you would use the current market price
      order.exitPrice = order.entryPrice;
      order.exitTimestamp = new Date();
      order.status = 'CLOSED';
      order.profitLoss = 0; // No profit/loss when closing at entry price

      console.log(`[MockTradingAPI] Order closed (closeAll): ${JSON.stringify(order)}`);
    }

    console.log(`[MockTradingAPI] Closed ${openOrders.length} open orders`);
  }
}
