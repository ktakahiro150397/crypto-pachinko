import {
  ICrashDetectionStrategy,
  IRecoveryDetectionStrategy,
  ITradingStrategy,
} from './interfaces';
import { CryptoPrice } from '../types';

/**
 * Default crash detection based on percentage drop from previous day
 */
export class PercentageDropCrashDetection implements ICrashDetectionStrategy {
  constructor(private thresholdPercentage: number) {}

  isCrash(currentPrice: number, basePrice: number): boolean {
    const dropPercentage = ((basePrice - currentPrice) / basePrice) * 100;
    const isCrashDetected = dropPercentage >= this.thresholdPercentage;

    // Only log when crash is detected
    if (isCrashDetected) {
      console.log(
        `[Crash Debug] CRASH DETECTED! currentPrice=${currentPrice}, basePrice=${basePrice}, drop=${dropPercentage.toFixed(2)}%, threshold=${this.thresholdPercentage}%`
      );
    }

    return isCrashDetected;
  }

  getThreshold(): number {
    return this.thresholdPercentage;
  }
}

/**
 * Recovery detection based on consecutive price increases
 */
export class ConsecutiveIncreaseRecoveryDetection implements IRecoveryDetectionStrategy {
  constructor(private consecutiveIncreases: number = 3) {}

  isRecovering(recentPrices: CryptoPrice[]): boolean {
    if (recentPrices.length < this.consecutiveIncreases + 1) {
      console.log(
        `[Recovery Debug] Not enough data: need ${this.consecutiveIncreases + 1}, have ${recentPrices.length}`
      );
      return false;
    }

    // Check last N prices for consecutive increases
    const prices = recentPrices.slice(-this.consecutiveIncreases - 1);
    console.log(
      `[Recovery Debug] Checking ${this.consecutiveIncreases} consecutive increases with prices:`,
      prices.map((p) => `${p.price}@${p.timestamp.toISOString().substr(11, 8)}`).join(' -> ')
    );

    for (let i = 1; i < prices.length; i++) {
      if (prices[i].price <= prices[i - 1].price) {
        console.log(
          `[Recovery Debug] Failed at index ${i}: ${prices[i].price} <= ${prices[i - 1].price}`
        );
        return false;
      }
    }
    console.log(
      `[Recovery Debug] SUCCESS: Found ${this.consecutiveIncreases} consecutive increases`
    );
    return true;
  }

  getDescription(): string {
    return `${this.consecutiveIncreases} consecutive increases`;
  }
}

/**
 * Default trading strategy combining percentage drop crash detection
 * and consecutive increase recovery detection
 */
export class DefaultTradingStrategy implements ITradingStrategy {
  public crashDetection: ICrashDetectionStrategy;
  public recoveryDetection: IRecoveryDetectionStrategy;
  private stopLossPercentage: number | null;
  private takeProfitPercentage: number | null;

  constructor(
    crashThresholdPercentage: number = 20,
    recoveryConsecutiveIncreases: number = 3,
    stopLossPercentage: number | null = 10,
    takeProfitPercentage: number | null = 20
  ) {
    this.crashDetection = new PercentageDropCrashDetection(crashThresholdPercentage);
    this.recoveryDetection = new ConsecutiveIncreaseRecoveryDetection(recoveryConsecutiveIncreases);
    this.stopLossPercentage = stopLossPercentage;
    this.takeProfitPercentage = takeProfitPercentage;
  }

  getStrategyName(): string {
    return 'DefaultStrategy';
  }

  getStopLossPercentage(): number | null {
    return this.stopLossPercentage;
  }

  getTakeProfitPercentage(): number | null {
    return this.takeProfitPercentage;
  }

  shouldTriggerStopLoss(entryPrice: number, currentPrice: number): boolean {
    if (this.stopLossPercentage === null) {
      return false;
    }

    // For LONG positions, stop loss triggers when price drops below entry price by SL percentage
    const dropPercentage = ((entryPrice - currentPrice) / entryPrice) * 100;
    return dropPercentage >= this.stopLossPercentage;
  }

  shouldTriggerTakeProfit(entryPrice: number, currentPrice: number): boolean {
    if (this.takeProfitPercentage === null) {
      return false;
    }

    // For LONG positions, take profit triggers when price rises above entry price by TP percentage
    const gainPercentage = ((currentPrice - entryPrice) / entryPrice) * 100;
    return gainPercentage >= this.takeProfitPercentage;
  }
}

/**
 * Aggressive trading strategy with lower crash threshold
 */
export class AggressiveTradingStrategy implements ITradingStrategy {
  public crashDetection: ICrashDetectionStrategy;
  public recoveryDetection: IRecoveryDetectionStrategy;
  private stopLossPercentage: number | null;
  private takeProfitPercentage: number | null;

  constructor(stopLossPercentage: number | null = 7, takeProfitPercentage: number | null = 15) {
    this.crashDetection = new PercentageDropCrashDetection(10);
    this.recoveryDetection = new ConsecutiveIncreaseRecoveryDetection(2);
    this.stopLossPercentage = stopLossPercentage;
    this.takeProfitPercentage = takeProfitPercentage;
  }

  getStrategyName(): string {
    return 'AggressiveStrategy';
  }

  getStopLossPercentage(): number | null {
    return this.stopLossPercentage;
  }

  getTakeProfitPercentage(): number | null {
    return this.takeProfitPercentage;
  }

  shouldTriggerStopLoss(entryPrice: number, currentPrice: number): boolean {
    if (this.stopLossPercentage === null) {
      return false;
    }

    // For LONG positions, stop loss triggers when price drops below entry price by SL percentage
    const dropPercentage = ((entryPrice - currentPrice) / entryPrice) * 100;
    return dropPercentage >= this.stopLossPercentage;
  }

  shouldTriggerTakeProfit(entryPrice: number, currentPrice: number): boolean {
    if (this.takeProfitPercentage === null) {
      return false;
    }

    // For LONG positions, take profit triggers when price rises above entry price by TP percentage
    const gainPercentage = ((currentPrice - entryPrice) / entryPrice) * 100;
    return gainPercentage >= this.takeProfitPercentage;
  }
}

/**
 * Conservative trading strategy with higher crash threshold
 */
export class ConservativeTradingStrategy implements ITradingStrategy {
  public crashDetection: ICrashDetectionStrategy;
  public recoveryDetection: IRecoveryDetectionStrategy;
  private stopLossPercentage: number | null;
  private takeProfitPercentage: number | null;

  constructor(stopLossPercentage: number | null = 15, takeProfitPercentage: number | null = 30) {
    this.crashDetection = new PercentageDropCrashDetection(30);
    this.recoveryDetection = new ConsecutiveIncreaseRecoveryDetection(5);
    this.stopLossPercentage = stopLossPercentage;
    this.takeProfitPercentage = takeProfitPercentage;
  }

  getStrategyName(): string {
    return 'ConservativeStrategy';
  }

  getStopLossPercentage(): number | null {
    return this.stopLossPercentage;
  }

  getTakeProfitPercentage(): number | null {
    return this.takeProfitPercentage;
  }

  shouldTriggerStopLoss(entryPrice: number, currentPrice: number): boolean {
    if (this.stopLossPercentage === null) {
      return false;
    }

    // For LONG positions, stop loss triggers when price drops below entry price by SL percentage
    const dropPercentage = ((entryPrice - currentPrice) / entryPrice) * 100;
    return dropPercentage >= this.stopLossPercentage;
  }

  shouldTriggerTakeProfit(entryPrice: number, currentPrice: number): boolean {
    if (this.takeProfitPercentage === null) {
      return false;
    }

    // For LONG positions, take profit triggers when price rises above entry price by TP percentage
    const gainPercentage = ((currentPrice - entryPrice) / entryPrice) * 100;
    return gainPercentage >= this.takeProfitPercentage;
  }
}
