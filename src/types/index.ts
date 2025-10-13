export interface CryptoPrice {
  symbol: string;
  price: number;
  timestamp: Date;
  source: string;
}

export interface TradingOrder {
  id?: number;
  symbol: string;
  orderType: 'LONG' | 'SHORT';
  entryPrice: number;
  entryTimestamp: Date;
  exitPrice?: number;
  exitTimestamp?: Date;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  strategy: string;
  profitLoss?: number;
  createdAt?: Date;
}

export interface CrashEvent {
  id?: number;
  symbol: string;
  detectedTimestamp: Date;
  previousDayPrice: number;
  currentPrice: number;
  dropPercentage: number;
}

export interface PriceData {
  symbol: string;
  prices: number[];
  timestamps: Date[];
}
