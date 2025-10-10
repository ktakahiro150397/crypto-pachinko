import { ICrashDetectionStrategy, IRecoveryDetectionStrategy, ITradingStrategy } from './interfaces';
import { CryptoPrice } from '../types';

/**
 * Default crash detection based on percentage drop from previous day
 */
export class PercentageDropCrashDetection implements ICrashDetectionStrategy {
  constructor(private thresholdPercentage: number) {}

  isCrash(currentPrice: number, previousDayPrice: number): boolean {
    const dropPercentage = ((previousDayPrice - currentPrice) / previousDayPrice) * 100;
    return dropPercentage >= this.thresholdPercentage;
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
      return false;
    }

    // Check last N prices for consecutive increases
    const prices = recentPrices.slice(-this.consecutiveIncreases - 1);
    for (let i = 1; i < prices.length; i++) {
      if (prices[i].price <= prices[i - 1].price) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Default trading strategy combining percentage drop crash detection
 * and consecutive increase recovery detection
 */
export class DefaultTradingStrategy implements ITradingStrategy {
  public crashDetection: ICrashDetectionStrategy;
  public recoveryDetection: IRecoveryDetectionStrategy;

  constructor(
    crashThresholdPercentage: number = 20,
    recoveryConsecutiveIncreases: number = 3
  ) {
    this.crashDetection = new PercentageDropCrashDetection(crashThresholdPercentage);
    this.recoveryDetection = new ConsecutiveIncreaseRecoveryDetection(recoveryConsecutiveIncreases);
  }

  getStrategyName(): string {
    return 'DefaultStrategy';
  }
}

/**
 * Aggressive trading strategy with lower crash threshold
 */
export class AggressiveTradingStrategy implements ITradingStrategy {
  public crashDetection: ICrashDetectionStrategy;
  public recoveryDetection: IRecoveryDetectionStrategy;

  constructor() {
    this.crashDetection = new PercentageDropCrashDetection(10);
    this.recoveryDetection = new ConsecutiveIncreaseRecoveryDetection(2);
  }

  getStrategyName(): string {
    return 'AggressiveStrategy';
  }
}

/**
 * Conservative trading strategy with higher crash threshold
 */
export class ConservativeTradingStrategy implements ITradingStrategy {
  public crashDetection: ICrashDetectionStrategy;
  public recoveryDetection: IRecoveryDetectionStrategy;

  constructor() {
    this.crashDetection = new PercentageDropCrashDetection(30);
    this.recoveryDetection = new ConsecutiveIncreaseRecoveryDetection(5);
  }

  getStrategyName(): string {
    return 'ConservativeStrategy';
  }
}
