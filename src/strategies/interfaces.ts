import { CryptoPrice } from '../types';

/**
 * Interface for crash detection strategies
 * Allows different coins to use different crash detection logic
 */
export interface ICrashDetectionStrategy {
  /**
   * Determines if a crash has occurred based on recent price data
   * @param recentPrices Array of recent prices (most recent last), should contain at least 50 prices
   * @returns true if a crash is detected
   */
  isCrash(recentPrices: CryptoPrice[]): boolean;

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

  /**
   * Get stop loss percentage (if set)
   * @returns stop loss percentage or null if not set
   */
  getStopLossPercentage(): number | null;

  /**
   * Get take profit percentage (if set)
   * @returns take profit percentage or null if not set
   */
  getTakeProfitPercentage(): number | null;

  /**
   * Check if stop loss should be triggered
   * @param entryPrice Original entry price
   * @param currentPrice Current market price
   * @returns true if stop loss should be triggered
   */
  shouldTriggerStopLoss(entryPrice: number, currentPrice: number): boolean;

  /**
   * Check if take profit should be triggered
   * @param entryPrice Original entry price
   * @param currentPrice Current market price
   * @returns true if take profit should be triggered
   */
  shouldTriggerTakeProfit(entryPrice: number, currentPrice: number): boolean;
}
