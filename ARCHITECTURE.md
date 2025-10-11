# Architecture Overview

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Crypto Pachinko System                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐              ┌──────────────────────┐
│  Price Collector     │              │   Trading Bot        │
│  (priceCollector.ts) │              │   (tradingBot.ts)    │
└──────────┬───────────┘              └──────────┬───────────┘
           │                                     │
           │                                     │
           ▼                                     ▼
┌──────────────────────┐              ┌──────────────────────┐
│  PriceCollector      │              │  TradingBotService   │
│  Service             │              │                      │
│                      │              │  ┌───────────────┐   │
│  - Real-time collect │              │  │  Strategies:  │   │
│  - Historical insert │              │  │  - Default    │   │
│  - Batch processing  │              │  │  - Aggressive │   │
└──────────┬───────────┘              │  │  - Conservative│  │
           │                          │  └───────────────┘   │
           │                          └──────────┬───────────┘
           │                                     │
           ▼                                     ▼
┌──────────────────────────────────────────────────────────────┐
│                   Database Repositories                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ PriceRepo    │  │ OrderRepo    │  │ CrashRepo    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└──────────┬────────────────────────────────────┬──────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────────────────────────────────────────────┐
│                      MySQL Database                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │crypto_prices │  │trading_orders│  │crash_events  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                        Mock APIs                              │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  MockPriceAPI    │         │  MockTradingAPI  │          │
│  │  - getCurrentPrice│         │  - executeLong   │          │
│  │  - simulateCrash │         │  - closeOrder    │          │
│  └──────────────────┘         └──────────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow

### Price Collection Flow
```
MockPriceAPI → PriceCollectorService → PriceRepository → MySQL
     │              │
     │              ├─ Real-time: Every 5s (configurable)
     │              └─ Historical: Batch insert
     │
     └─ Simulates price fluctuations
```

### Trading Bot Flow
```
1. Read latest price from DB
   │
   ▼
2. Check if crash state exists
   │
   ├─ NO: Check for crash (compare with yesterday)
   │      │
   │      └─ If crash detected:
   │         - Log crash event
   │         - Set crash state = true
   │
   └─ YES: Check for recovery (consecutive price increases)
          │
          └─ If recovery detected:
             - Execute long order via MockTradingAPI
             - Store order in DB
             - Set crash state = false
```

## Strategy Pattern

```
ITradingStrategy
├─ ICrashDetectionStrategy
│  └─ PercentageDropCrashDetection
│     - Default: 20% threshold
│     - Aggressive: 10% threshold
│     - Conservative: 30% threshold
│
└─ IRecoveryDetectionStrategy
   └─ ConsecutiveIncreaseRecoveryDetection
      - Default: 3 consecutive increases
      - Aggressive: 2 consecutive increases
      - Conservative: 5 consecutive increases
```

## Configuration

Each cryptocurrency can have its own strategy:
- BTC: DefaultTradingStrategy (20% crash, 3 consecutive increases)
- ETH: DefaultTradingStrategy (20% crash, 3 consecutive increases)
- XRP: AggressiveTradingStrategy (10% crash, 2 consecutive increases)

Users can create custom strategies by implementing the strategy interfaces.
