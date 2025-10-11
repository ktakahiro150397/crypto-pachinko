# バックテスト使用例

このファイルは、バックテスト機能の使い方を具体的な例で示します。

## 基本的な使い方

### ステップ1: 過去データの準備

```bash
# 過去7日分のサンプルデータを生成
npm run price-collector -- --historical
```

このコマンドは、BTC、ETH、XRPの過去7日間の価格データ（1時間ごと）をデータベースに挿入します。

### ステップ2: バックテストの実行

```bash
# 過去7日間のデータでバックテスト
npm run backtest
```

または特定の期間を指定:

```bash
# 2025年10月1日から10月11日までのデータでバックテスト
npm run backtest -- 2025-10-01 2025-10-11
```

### ステップ3: 結果の確認

実行すると、以下のような結果が表示されます:

```
=== Starting Backtest ===
Period: 2025-10-01T00:00:00.000Z to 2025-10-11T00:00:00.000Z
Symbols: BTC, ETH, XRP
Interval: 5000ms

[HistoricalPriceAPI] Loading data for BTC from 2025-10-01T00:00:00.000Z to 2025-10-11T00:00:00.000Z
[HistoricalPriceAPI] Loaded 240 price records for BTC
[HistoricalPriceAPI] Loading data for ETH from 2025-10-01T00:00:00.000Z to 2025-10-11T00:00:00.000Z
[HistoricalPriceAPI] Loaded 240 price records for ETH
[HistoricalPriceAPI] Loading data for XRP from 2025-10-01T00:00:00.000Z to 2025-10-11T00:00:00.000Z
[HistoricalPriceAPI] Loaded 240 price records for XRP

Progress: 41.7% (300 prices processed)
Progress: 83.3% (600 prices processed)

=== Backtest Complete ===
Total prices processed: 720
Duration: 12.34s

=== Backtest Results ===
Total Trades: 5
Profitable Trades: 3
Losing Trades: 2
Win Rate: 60.00%
Total Profit: $1500.00
Total Loss: $500.00
Net Profit: $1000.00

=== Trade Details ===
1. BTC [CLOSED] Entry: $48000.00 | Exit: $49000.00 | P/L: +$1000.00 | Strategy: DefaultStrategy
2. ETH [CLOSED] Entry: $2900.00 | Exit: $2950.00 | P/L: +$50.00 | Strategy: DefaultStrategy
3. BTC [CLOSED] Entry: $49500.00 | Exit: $49000.00 | P/L: -$500.00 | Strategy: DefaultStrategy
4. XRP [CLOSED] Entry: $1.45 | Exit: $1.50 | P/L: +$0.05 | Strategy: DefaultStrategy
5. ETH [CLOSED] Entry: $3000.00 | Exit: $2950.00 | P/L: -$50.00 | Strategy: DefaultStrategy
```

## 高度な使い方

### 異なる戦略の比較

`src/backtest.ts`をカスタマイズして、複数の戦略を比較できます:

```typescript
import { DefaultTradingStrategy, AggressiveTradingStrategy } from './strategies/implementations';

// BTCには積極的戦略を使用
backtest.registerStrategy('BTC', new AggressiveTradingStrategy());

// ETHには保守的戦略を使用
backtest.registerStrategy('ETH', new ConservativeTradingStrategy());
```

### パラメータの最適化

異なる暴落閾値でテストして最適な値を見つける:

```typescript
// 10%の閾値でテスト
backtest.registerStrategy('BTC', new DefaultTradingStrategy(10));

// 15%の閾値でテスト
backtest.registerStrategy('BTC', new DefaultTradingStrategy(15));

// 20%の閾値でテスト
backtest.registerStrategy('BTC', new DefaultTradingStrategy(20));
```

## よくある質問

**Q: バックテストに必要なデータ量は？**

A: 最低でも24時間以上のデータが必要です（前日比での暴落検知のため）。より信頼性の高い結果を得るには、1週間以上のデータを推奨します。

**Q: リアルタイムデータとバックテストデータは干渉しませんか？**

A: いいえ。バックテストで挿入されるデータには`source='backtest'`フラグが付くため、区別できます。

**Q: バックテスト後にデータをクリーンアップする必要がありますか？**

A: 通常は不要ですが、必要に応じて以下のクエリでバックテストデータを削除できます:

```sql
DELETE FROM crypto_prices WHERE source = 'backtest';
DELETE FROM trading_orders WHERE strategy LIKE '%Backtest%';
```

**Q: 実際の取引データを使用できますか？**

A: はい。実際の取引所APIから取得したデータをデータベースにインポートすれば、より正確なバックテストが可能です。

## 次のステップ

1. 異なる期間でバックテストを実行
2. 結果を比較して戦略を改善
3. パラメータを調整して最適化
4. 実際の取引を開始する前に十分なテストを実施

詳細は `BACKTEST_GUIDE.md` を参照してください。
