import { Hyperliquid } from 'hyperliquid';
import { ITradingAPI } from '../interfaces/ITradingAPI';

/**
 * Hyperliquid trading API implementation
 * Executes real trades on Hyperliquid DEX
 * 
 * Note: This implementation uses Hyperliquid's order management system directly.
 * Order tracking relies on Hyperliquid's API, not local state, to prevent order close mismatches.
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
   * 
   * IMPORTANT: This method queries Hyperliquid directly for all open orders
   * and closes them, ensuring no order close mismatches occur.
   * It does NOT rely on local state (orderIdMap) to prevent scenarios where
   * local state is out of sync with actual Hyperliquid orders.
   */
  async closeAllOrders(): Promise<void> {
    try {
      await this.client.ensureInitialized();

      console.log('[HyperliquidTradingAPI] Fetching all open orders from Hyperliquid');

      // Get wallet address for querying orders
      const walletAddr = this.walletAddress || (await this.getWalletAddressFromClient());
      
      if (!walletAddr) {
        throw new Error('Cannot determine wallet address for fetching open orders');
      }

      // Fetch actual open orders from Hyperliquid
      const openOrders = await this.client.info.getUserOpenOrders(walletAddr);
      
      console.log(
        `[HyperliquidTradingAPI] Found ${openOrders.length} open orders on Hyperliquid`
      );

      if (openOrders.length === 0) {
        console.log('[HyperliquidTradingAPI] No open orders to close');
        this.orderIdMap.clear(); // Clear local map as well
        return;
      }

      // Cancel all orders using Hyperliquid API (this cancels ALL orders atomically)
      console.log('[HyperliquidTradingAPI] Closing all open orders via cancelAllOrders()');
      const response = await this.client.exchange.cancelAllOrders();

      console.log(
        `[HyperliquidTradingAPI] All orders closed:`,
        JSON.stringify(response, null, 2)
      );

      // Clear the order ID map since all orders are closed
      this.orderIdMap.clear();

      console.log('[HyperliquidTradingAPI] All open orders have been closed successfully');
    } catch (error) {
      console.error('[HyperliquidTradingAPI] Error closing all orders:', error);
      throw error;
    }
  }

  /**
   * Get wallet address from the Hyperliquid client
   * This is needed when walletAddress is not provided in constructor
   */
  private async getWalletAddressFromClient(): Promise<string | null> {
    try {
      // The Hyperliquid SDK can derive the wallet address from the private key
      // We can access it through the client's internal state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const address = (this.client as any).walletAddress;
      return address || null;
    } catch (error) {
      console.error('[HyperliquidTradingAPI] Error getting wallet address:', error);
      return null;
    }
  }

  /**
   * Get the actual open orders from Hyperliquid
   * This method allows you to sync local state with Hyperliquid's actual state
   */
  async getActualOpenOrders(): Promise<unknown[]> {
    try {
      await this.client.ensureInitialized();
      
      const walletAddr = this.walletAddress || (await this.getWalletAddressFromClient());
      
      if (!walletAddr) {
        throw new Error('Cannot determine wallet address for fetching open orders');
      }

      const openOrders = await this.client.info.getUserOpenOrders(walletAddr);
      console.log(`[HyperliquidTradingAPI] Retrieved ${openOrders.length} open orders from Hyperliquid`);
      
      return openOrders;
    } catch (error) {
      console.error('[HyperliquidTradingAPI] Error getting open orders:', error);
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
