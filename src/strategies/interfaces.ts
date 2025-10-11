import { CryptoPrice } from '../types';

/**
 * Interface for crash detection strategies
 * Allows different coins to use different crash detection logic
 */
export interface ICrashDetectionStrategy {
  /**
   * Determines if a crash has occurred based on price data
   * @param currentPrice Current cryptocurrency price
   * @param previousDayPrice Price from 24 hours ago
   * @returns true if a crash is detected
   */
  isCrash(currentPrice: number, previousDayPrice: number): boolean;

  /**
   * Get the crash threshold percentage
   */
  getThreshold(): number;
}

/**
 * Interface for recovery detection strategies
 * Allows different coins to use different recovery detection logic
 */
export interface IRecoveryDetectionStrategy {
  /**
   * Determines if the price has stopped falling and is recovering
   * @param recentPrices Array of recent prices (most recent last)
   * @returns true if recovery is detected
   */
  isRecovering(recentPrices: CryptoPrice[]): boolean;
}

/**
 * Interface for trading strategies
 * Combines crash and recovery detection
 */
export interface ITradingStrategy {
  crashDetection: ICrashDetectionStrategy;
  recoveryDetection: IRecoveryDetectionStrategy;
  getStrategyName(): string;
}
