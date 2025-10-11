import { IHistoricalDataProvider } from '../interfaces/IHistoricalDataProvider';
import { CryptoPrice } from '../types';

/**
 * Binance API-based historical data provider
 * Fetches historical OHLC data from Binance in bulk
 * 
 * Uses Binance Klines/Candlestick API endpoint
 * Fetches data in batches to avoid rate limits
 */
export class BinanceHistoricalDataProvider implements IHistoricalDataProvider {
  private baseUrl = 'https://api.binance.com';
  private symbolMap: Map<string, string> = new Map([
    ['BTC', 'BTCUSDT'],
    ['ETH', 'ETHUSDT'],
    ['XRP', 'XRPUSDT'],
  ]);

  /**
   * Load historical data from Binance Klines API
   * Fetches in bulk with proper batching
   */
  async loadHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<CryptoPrice[]> {
    const tradingPair = this.symbolMap.get(symbol) || `${symbol}USDT`;
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    
    // Use 1-hour intervals for historical data
    const interval = '1h';
    
    console.log(
      `[BinanceHistoricalDataProvider] Fetching historical data for ${symbol} (${tradingPair})`
    );
    console.log(`  Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const prices: CryptoPrice[] = [];
    let currentStart = startTime;
    const batchSize = 1000; // Binance limit per request

    while (currentStart < endTime) {
      try {
        const url = `${this.baseUrl}/api/v3/klines?symbol=${tradingPair}&interval=${interval}&startTime=${currentStart}&limit=${batchSize}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json() as Array<[
          number, // Open time
          string, // Open
          string, // High
          string, // Low
          string, // Close
          string, // Volume
          number, // Close time
          string, // Quote asset volume
          number, // Number of trades
          string, // Taker buy base asset volume
          string, // Taker buy quote asset volume
          string  // Ignore
        ]>;

        if (data.length === 0) break;

        for (const candle of data) {
          const timestamp = new Date(candle[0]);
          
          // Use close price for historical data
          const price = parseFloat(candle[4]);
          
          if (timestamp.getTime() <= endTime) {
            prices.push({
              symbol,
              price,
              timestamp,
              source: 'binance_api',
            });
          }
        }

        // Update for next batch
        const lastTimestamp = data[data.length - 1][0];
        currentStart = lastTimestamp + 1;

        // Rate limiting: wait 200ms between requests
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log(
          `[BinanceHistoricalDataProvider] Fetched ${data.length} records (total: ${prices.length})`
        );
      } catch (error) {
        console.error(`[BinanceHistoricalDataProvider] Error fetching data:`, error);
        throw error;
      }
    }

    console.log(`[BinanceHistoricalDataProvider] Loaded ${prices.length} total records for ${symbol}`);
    return prices;
  }

  /**
   * Add a custom symbol mapping
   */
  addSymbolMapping(symbol: string, tradingPair: string): void {
    this.symbolMap.set(symbol, tradingPair);
  }
}
