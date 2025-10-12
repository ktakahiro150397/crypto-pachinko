import { Hyperliquid } from 'hyperliquid';
import { ITradingAPI } from '../interfaces/ITradingAPI';

/**
 * Hyperliquid trading API implementation
 * Executes real trades on Hyperliquid DEX
 */
export class HyperliquidTradingAPI implements ITradingAPI {
  private client: Hyperliquid;
  private orderIdMap: Map<number, string> = new Map(); // Map internal IDs to Hyperliquid order IDs
  private nextOrderId = 1;
  private walletAddress?: string;

  constructor(
    privateKey: string,
    testnet: boolean = true,
    walletAddress?: string,
    vaultAddress?: string
  ) {
    this.client = new Hyperliquid({
      privateKey,
      testnet,
      walletAddress,
      vaultAddress,
      enableWs: false, // Disable WebSocket for simpler implementation
    });
    this.walletAddress = walletAddress;
  }

  /**
   * Execute a long order on Hyperliquid
   */
  async executeLongOrder(symbol: string, price: number, strategy: string): Promise<number> {
    try {
      await this.client.ensureInitialized();

      // Convert symbol format (BTC -> BTC, ETH -> ETH, etc.)
      const coin = symbol;

      // Place a limit buy order
      const order = {
        coin,
        is_buy: true,
        sz: 0.01, // Minimum size - adjust based on requirements
        limit_px: price.toString(),
        order_type: { limit: { tif: 'Gtc' } }, // Good-til-cancel
        reduce_only: false,
      };

      console.log(`[HyperliquidTradingAPI] Placing long order for ${symbol} at ${price}`, order);
      const response = await this.client.exchange.placeOrder(order);

      console.log(
        `[HyperliquidTradingAPI] Long order response:`,
        JSON.stringify(response, null, 2)
      );

      // Extract order ID from response
      let hyperliquidOrderId: string;
      if (response?.response?.type === 'order' && response.response.data?.statuses) {
        const status = response.response.data.statuses[0];
        if (status && 'resting' in status) {
          hyperliquidOrderId = status.resting.oid.toString();
        } else {
          throw new Error('Order was not resting (may have been filled immediately)');
        }
      } else {
        throw new Error('Unexpected order response format');
      }

      // Map internal ID to Hyperliquid order ID
      const internalId = this.nextOrderId++;
      this.orderIdMap.set(internalId, hyperliquidOrderId);

      console.log(
        `[HyperliquidTradingAPI] Long order executed: ID=${internalId}, HyperliquidID=${hyperliquidOrderId}, symbol=${symbol}, price=${price}, strategy=${strategy}`
      );

      return internalId;
    } catch (error) {
      console.error('[HyperliquidTradingAPI] Error executing long order:', error);
      throw error;
    }
  }

  /**
   * Close a specific order
   * Note: For simplicity, this cancels the order. In a real implementation,
   * you might want to place a market sell order to close the position.
   */
  async closeOrder(orderId: number, exitPrice: number): Promise<void> {
    try {
      await this.client.ensureInitialized();

      const hyperliquidOrderId = this.orderIdMap.get(orderId);
      if (!hyperliquidOrderId) {
        throw new Error(`Order ${orderId} not found in order map`);
      }

      console.log(
        `[HyperliquidTradingAPI] Closing order ${orderId} (Hyperliquid ID: ${hyperliquidOrderId}) at ${exitPrice}`
      );

      // Cancel the order
      const cancelResponse = await this.client.exchange.cancelOrder({
        coin: '', // Will be filled by SDK
        o: parseInt(hyperliquidOrderId),
      });

      console.log(
        `[HyperliquidTradingAPI] Order closed:`,
        JSON.stringify(cancelResponse, null, 2)
      );

      // Remove from map
      this.orderIdMap.delete(orderId);
    } catch (error) {
      console.error('[HyperliquidTradingAPI] Error closing order:', error);
      throw error;
    }
  }

  /**
   * Close all open orders on Hyperliquid
   */
  async closeAllOrders(): Promise<void> {
    try {
      await this.client.ensureInitialized();

      console.log('[HyperliquidTradingAPI] Closing all open orders');

      // Cancel all orders using Hyperliquid API
      const response = await this.client.exchange.cancelAllOrders();

      console.log(
        `[HyperliquidTradingAPI] All orders closed:`,
        JSON.stringify(response, null, 2)
      );

      // Clear the order ID map
      this.orderIdMap.clear();

      console.log('[HyperliquidTradingAPI] All open orders have been closed');
    } catch (error) {
      console.error('[HyperliquidTradingAPI] Error closing all orders:', error);
      throw error;
    }
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string | undefined {
    return this.walletAddress;
  }

  /**
   * Disconnect from Hyperliquid
   */
  disconnect(): void {
    this.client.disconnect();
  }
}
