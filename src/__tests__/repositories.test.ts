import { PriceRepository, OrderRepository, CrashEventRepository } from '../database/repositories';
import { CryptoPrice, TradingOrder, CrashEvent } from '../types';

describe('Database Repositories - Time Truncation and Duplicate Handling', () => {
  describe('PriceRepository', () => {
    let repository: PriceRepository;

    beforeEach(() => {
      repository = new PriceRepository();
    });

    test('should truncate milliseconds when inserting price', async () => {
      const mockPrice: CryptoPrice = {
        symbol: 'BTC',
        price: 50000.123456,
        timestamp: new Date('2025-10-11T10:30:45.789Z'), // With milliseconds
        source: 'test'
      };

      // Mock the database execute method
      const mockExecute = jest.fn().mockResolvedValue([{ insertId: 1 }]);
      jest.spyOn(repository['db'].getPool(), 'execute').mockImplementation(mockExecute);

      await repository.insertPrice(mockPrice);

      // Verify that the timestamp was truncated (milliseconds set to 0)
      const expectedTimestamp = new Date('2025-10-11T10:30:45.000Z');
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('ON DUPLICATE KEY UPDATE'),
        [mockPrice.symbol, mockPrice.price, expectedTimestamp, mockPrice.source]
      );
    });

    test('should use ON DUPLICATE KEY UPDATE for handling duplicates', async () => {
      const mockPrice: CryptoPrice = {
        symbol: 'BTC',
        price: 50000.123456,
        timestamp: new Date('2025-10-11T10:30:45.000Z'),
        source: 'test'
      };

      const mockExecute = jest.fn().mockResolvedValue([{ insertId: 1 }]);
      jest.spyOn(repository['db'].getPool(), 'execute').mockImplementation(mockExecute);

      await repository.insertPrice(mockPrice);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('ON DUPLICATE KEY UPDATE'),
        expect.any(Array)
      );
    });

    test('should handle batch insert with truncated timestamps', async () => {
      const mockPrices: CryptoPrice[] = [
        {
          symbol: 'BTC',
          price: 50000,
          timestamp: new Date('2025-10-11T10:30:45.123Z'),
          source: 'test1'
        },
        {
          symbol: 'ETH',
          price: 3000,
          timestamp: new Date('2025-10-11T10:30:45.456Z'),
          source: 'test2'
        }
      ];

      const mockQuery = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(repository['db'].getPool(), 'query').mockImplementation(mockQuery);

      await repository.insertPrices(mockPrices);

      // Verify that both timestamps were truncated
      const expectedValues = [
        ['BTC', 50000, new Date('2025-10-11T10:30:45.000Z'), 'test1'],
        ['ETH', 3000, new Date('2025-10-11T10:30:45.000Z'), 'test2']
      ];

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON DUPLICATE KEY UPDATE'),
        [expectedValues]
      );
    });
  });

  describe('OrderRepository', () => {
    let repository: OrderRepository;

    beforeEach(() => {
      repository = new OrderRepository();
    });

    test('should keep milliseconds in order timestamps', async () => {
      const mockOrder: TradingOrder = {
        symbol: 'BTC',
        orderType: 'LONG',
        entryPrice: 50000,
        entryTimestamp: new Date('2025-10-11T10:30:45.789Z'),
        exitTimestamp: new Date('2025-10-11T11:30:45.123Z'),
        status: 'CLOSED',
        strategy: 'test-strategy',
        profitLoss: 100
      };

      const mockExecute = jest.fn().mockResolvedValue([{ insertId: 1 }]);
      jest.spyOn(repository['db'].getPool(), 'execute').mockImplementation(mockExecute);

      await repository.insertOrder(mockOrder);

      // ミリ秒精度のタイムスタンプがそのまま保持されることを確認
      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(String),
        [
          mockOrder.symbol,
          mockOrder.orderType,
          mockOrder.entryPrice,
          mockOrder.entryTimestamp, // そのまま
          mockOrder.exitPrice || null,
          mockOrder.exitTimestamp, // そのまま
          mockOrder.status,
          mockOrder.strategy,
          mockOrder.profitLoss
        ]
      );
    });
  });

  describe('CrashEventRepository', () => {
    let repository: CrashEventRepository;

    beforeEach(() => {
      repository = new CrashEventRepository();
    });

    test('should keep milliseconds and handle duplicates in crash events', async () => {
      const mockEvent: CrashEvent = {
        symbol: 'BTC',
        detectedTimestamp: new Date('2025-10-11T10:30:45.999Z'),
        previousDayPrice: 51000,
        currentPrice: 45000,
        dropPercentage: -11.76
      };

      const mockExecute = jest.fn().mockResolvedValue([{ insertId: 1 }]);
      jest.spyOn(repository['db'].getPool(), 'execute').mockImplementation(mockExecute);

      await repository.insertCrashEvent(mockEvent);

      // ミリ秒精度のタイムスタンプがそのまま保持されることを確認
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('ON DUPLICATE KEY UPDATE'),
        [
          mockEvent.symbol,
          mockEvent.detectedTimestamp, // そのまま
          mockEvent.previousDayPrice,
          mockEvent.currentPrice,
          mockEvent.dropPercentage
        ]
      );
    });
  });
});
