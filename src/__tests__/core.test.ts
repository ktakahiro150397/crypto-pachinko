import { MockPriceAPI } from '../mocks/priceApi';
import { MockTradingAPI } from '../mocks/tradingApi';
import {
  DefaultTradingStrategy,
  AggressiveTradingStrategy,
  ConservativeTradingStrategy,
} from '../strategies/implementations';
import { CryptoPrice } from '../types';

describe('MockPriceAPI', () => {
  let priceAPI: MockPriceAPI;

  beforeEach(() => {
    priceAPI = new MockPriceAPI();
  });

  test('should return a price for BTC', async () => {
    const price = await priceAPI.getCurrentPrice('BTC');
    expect(price).toBeGreaterThan(0);
  });

  test('should simulate price crash', async () => {
    priceAPI.setBasePrice('BTC', 50000);
    const initialPrice = await priceAPI.getCurrentPrice('BTC');
    priceAPI.simulateCrash('BTC', 30);
    const crashedPrice = await priceAPI.getCurrentPrice('BTC');
    expect(crashedPrice).toBeLessThan(initialPrice * 0.75); // Should be around 70% of initial
  });

  test('should reset price to base', () => {
    priceAPI.setBasePrice('ETH', 3000);
    priceAPI.resetPrice('ETH');
    // After reset, price should be close to base again
  });
});

describe('MockTradingAPI', () => {
  let tradingAPI: MockTradingAPI;

  beforeEach(() => {
    tradingAPI = new MockTradingAPI();
  });

  test('should execute a long order', async () => {
    const orderId = await tradingAPI.executeLongOrder('BTC', 50000, 'TestStrategy');
    expect(orderId).toBeGreaterThan(0);

    const order = tradingAPI.getOrder(orderId);
    expect(order).toBeDefined();
    expect(order?.symbol).toBe('BTC');
    expect(order?.orderType).toBe('LONG');
    expect(order?.entryPrice).toBe(50000);
    expect(order?.status).toBe('OPEN');
  });

  test('should close an order', async () => {
    const orderId = await tradingAPI.executeLongOrder('BTC', 50000, 'TestStrategy');
    await tradingAPI.closeOrder(orderId, 55000);

    const order = tradingAPI.getOrder(orderId);
    expect(order?.status).toBe('CLOSED');
    expect(order?.exitPrice).toBe(55000);
    expect(order?.profitLoss).toBe(5000);
  });

  test('should get open orders for a symbol', async () => {
    await tradingAPI.executeLongOrder('BTC', 50000, 'TestStrategy');
    await tradingAPI.executeLongOrder('BTC', 51000, 'TestStrategy');
    await tradingAPI.executeLongOrder('ETH', 3000, 'TestStrategy');

    const btcOrders = tradingAPI.getOpenOrders('BTC');
    expect(btcOrders.length).toBe(2);
    expect(btcOrders.every((o) => o.symbol === 'BTC')).toBe(true);
  });

  test('should close all open orders', async () => {
    // Create some orders
    await tradingAPI.executeLongOrder('BTC', 50000, 'TestStrategy');
    await tradingAPI.executeLongOrder('BTC', 51000, 'TestStrategy');
    await tradingAPI.executeLongOrder('ETH', 3000, 'TestStrategy');

    // Verify we have open orders
    expect(tradingAPI.getAllOrders().filter((o) => o.status === 'OPEN').length).toBe(3);

    // Close all orders
    await tradingAPI.closeAllOrders();

    // Verify all orders are closed
    const openOrders = tradingAPI.getAllOrders().filter((o) => o.status === 'OPEN');
    expect(openOrders.length).toBe(0);

    // Verify orders are marked as CLOSED
    const closedOrders = tradingAPI.getAllOrders().filter((o) => o.status === 'CLOSED');
    expect(closedOrders.length).toBe(3);
  });
});

describe('Trading Strategies', () => {
  describe('DefaultTradingStrategy', () => {
    let strategy: DefaultTradingStrategy;

    beforeEach(() => {
      strategy = new DefaultTradingStrategy(20);
    });

    test('should detect crash when price drops 20%', () => {
      const isCrash = strategy.crashDetection.isCrash(40000, 50000);
      expect(isCrash).toBe(true);
    });

    test('should not detect crash when price drops less than 20%', () => {
      const isCrash = strategy.crashDetection.isCrash(45000, 50000);
      expect(isCrash).toBe(false);
    });

    test('should detect recovery after consecutive increases', () => {
      const prices: CryptoPrice[] = [
        { symbol: 'BTC', price: 40000, timestamp: new Date(), source: 'test' },
        { symbol: 'BTC', price: 40500, timestamp: new Date(), source: 'test' },
        { symbol: 'BTC', price: 41000, timestamp: new Date(), source: 'test' },
        { symbol: 'BTC', price: 41500, timestamp: new Date(), source: 'test' },
      ];
      const isRecovering = strategy.recoveryDetection.isRecovering(prices);
      expect(isRecovering).toBe(true);
    });

    test('should not detect recovery without consecutive increases', () => {
      const prices: CryptoPrice[] = [
        { symbol: 'BTC', price: 40000, timestamp: new Date(), source: 'test' },
        { symbol: 'BTC', price: 40500, timestamp: new Date(), source: 'test' },
        { symbol: 'BTC', price: 40300, timestamp: new Date(), source: 'test' },
        { symbol: 'BTC', price: 41000, timestamp: new Date(), source: 'test' },
      ];
      const isRecovering = strategy.recoveryDetection.isRecovering(prices);
      expect(isRecovering).toBe(false);
    });
  });

  describe('AggressiveTradingStrategy', () => {
    let strategy: AggressiveTradingStrategy;

    beforeEach(() => {
      strategy = new AggressiveTradingStrategy();
    });

    test('should have lower crash threshold (10%)', () => {
      const threshold = strategy.crashDetection.getThreshold();
      expect(threshold).toBe(10);
    });

    test('should detect crash at 10% drop', () => {
      const isCrash = strategy.crashDetection.isCrash(45000, 50000);
      expect(isCrash).toBe(true);
    });
  });

  describe('ConservativeTradingStrategy', () => {
    let strategy: ConservativeTradingStrategy;

    beforeEach(() => {
      strategy = new ConservativeTradingStrategy();
    });

    test('should have higher crash threshold (30%)', () => {
      const threshold = strategy.crashDetection.getThreshold();
      expect(threshold).toBe(30);
    });

    test('should not detect crash at 20% drop', () => {
      const isCrash = strategy.crashDetection.isCrash(40000, 50000);
      expect(isCrash).toBe(false);
    });

    test('should detect crash at 30% drop', () => {
      const isCrash = strategy.crashDetection.isCrash(35000, 50000);
      expect(isCrash).toBe(true);
    });
  });
});
