import { IHistoricalDataProvider } from '../interfaces/IHistoricalDataProvider';
import { CryptoPrice } from '../types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * CSV-based historical data provider
 * Loads historical price data from CSV files
 * 
 * CSV Format:
 * timestamp,symbol,price
 * 2025-10-01T00:00:00.000Z,BTC,50000.00
 * 2025-10-01T01:00:00.000Z,BTC,50100.00
 */
export class CsvHistoricalDataProvider implements IHistoricalDataProvider {
  private dataDirectory: string;

  constructor(dataDirectory: string = './data') {
    this.dataDirectory = dataDirectory;
  }

  /**
   * Load historical data from CSV file
   * Expected filename format: {symbol}.csv or {symbol}_historical.csv
   */
  async loadHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<CryptoPrice[]> {
    const csvPath = this.findCsvFile(symbol);
    
    if (!csvPath) {
      throw new Error(`CSV file not found for symbol ${symbol} in ${this.dataDirectory}`);
    }

    console.log(`[CsvHistoricalDataProvider] Loading data from ${csvPath}`);

    const fileContent = await fs.promises.readFile(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    // Skip header
    const dataLines = lines.slice(1);
    
    const prices: CryptoPrice[] = [];
    
    for (const line of dataLines) {
      const [timestampStr, csvSymbol, priceStr] = line.split(',');
      
      if (!timestampStr || !priceStr) continue;
      
      const timestamp = new Date(timestampStr.trim());
      const price = parseFloat(priceStr.trim());
      
      // Filter by date range
      if (timestamp >= startDate && timestamp <= endDate) {
        prices.push({
          symbol: csvSymbol?.trim() || symbol,
          price,
          timestamp,
          source: 'csv',
        });
      }
    }

    console.log(`[CsvHistoricalDataProvider] Loaded ${prices.length} records for ${symbol}`);
    return prices;
  }

  /**
   * Find CSV file for a symbol
   */
  private findCsvFile(symbol: string): string | null {
    const possibleNames = [
      `${symbol}.csv`,
      `${symbol}_historical.csv`,
      `${symbol.toLowerCase()}.csv`,
      `${symbol.toLowerCase()}_historical.csv`,
    ];

    for (const filename of possibleNames) {
      const fullPath = path.join(this.dataDirectory, filename);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    return null;
  }

  /**
   * Set custom data directory
   */
  setDataDirectory(directory: string): void {
    this.dataDirectory = directory;
  }
}
