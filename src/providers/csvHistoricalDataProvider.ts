/* eslint-disable @typescript-eslint/no-unused-vars */
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
  async loadHistoricalData(symbol: string, startDate: Date, endDate: Date): Promise<CryptoPrice[]> {
    const csvPath = this.findCsvFile(symbol);

    if (!csvPath) {
      throw new Error(`CSV file not found for symbol ${symbol} in ${this.dataDirectory}`);
    }

    console.log(`[CsvHistoricalDataProvider] Loading data from ${csvPath}`);

    const fileContent = await fs.promises.readFile(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter((line) => line.trim());

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

export class CsvHistoricalFromBinanceDataProvider implements IHistoricalDataProvider {
  private dataDirectory: string;

  constructor(dataDirectory: string = './historical_data/btcusdt') {
    this.dataDirectory = dataDirectory;
  }

  async loadHistoricalData(symbol: string, startDate: Date, endDate: Date): Promise<CryptoPrice[]> {
    // Load all CSV files in the data directory and insert them all

    // Get all CSV files in the directory
    const files = fs.readdirSync(this.dataDirectory).filter((file) => file.endsWith('.csv'));
    console.log(
      `[CsvHistoricalFromBinanceDataProvider] Found ${files.length} CSV files in ${this.dataDirectory}`
    );

    const prices: CryptoPrice[] = [];

    for (const file of files) {
      const filePath = path.join(this.dataDirectory, file);
      console.log(`[CsvHistoricalFromBinanceDataProvider] Processing file: ${file}`);

      // Read file content for each line
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      const lines = fileContent.split('\n').filter((line) => line.trim());

      // Process each line (not using for...in which gives indices)
      for (const line of lines) {
        if (!line.trim()) continue; // Skip empty lines

        const columns = line.split(',');
        if (columns.length < 6) continue; // Skip malformed lines

        // Binance CSV format: [opentime, open, high, low, close, volume, closetime, ...]
        // We only need opentime (index 0) and close price (index 4)
        const opentime = columns[0];
        const close = columns[4];

        // Parse timestamp and price
        const opentimeNum = parseInt(opentime);
        const closePrice = parseFloat(close);

        // Skip invalid data
        if (isNaN(opentimeNum) || isNaN(closePrice)) continue;

        // Handle both milliseconds (13 digits) and microseconds (16 digits) timestamps
        let timestampMs: number;
        if (opentimeNum.toString().length >= 16) {
          // 16-digit microseconds timestamp - convert to milliseconds
          timestampMs = Math.floor(opentimeNum / 1000);
        } else {
          // 13-digit milliseconds timestamp - use as is
          timestampMs = opentimeNum;
        }

        const timestamp = new Date(timestampMs);

        // Filter by date range
        if (timestamp < startDate || timestamp > endDate) continue;

        const addData: CryptoPrice = {
          symbol: symbol,
          price: closePrice,
          timestamp: timestamp,
          source: 'binance_csv',
        };
        prices.push(addData);
      }
    }

    console.log(
      `[CsvHistoricalFromBinanceDataProvider] Loaded ${prices.length} total records for ${symbol}`
    );
    return prices;
  }
}
