# バックテスト機能ガイド

## 概要

バックテスト機能は、過去の価格データを使って取引戦略の有効性を検証するための機能です。実際の取引を行わずに、特定の期間における戦略のパフォーマンスをシミュレートできます。

## 仕組み

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│              バックテストシステム                          │
└─────────────────────────────────────────────────────────┘

1. データ読み込み
   ┌──────────────────┐
   │  Historical      │
   │  Price API       │─── データベースから過去価格を読み込み
   └──────────────────┘

2. 時系列再生
   ┌──────────────────┐
   │  Backtest        │
   │  Service         │─── 時系列順に価格を再生
   └──────────────────┘
             │
             ▼
3. 取引シミュレーション
   ┌──────────────────┐
   │  Trading Bot     │
   │  Service         │─── 実際の取引ボットと同じロジック
   └──────────────────┘
             │
             ▼
4. 結果分析
   ┌──────────────────┐
   │  Backtest        │
   │  Results         │─── 勝率、損益などを集計
   └──────────────────┘
```

### データフロー

1. **過去データの準備**
   - `HistoricalPriceAPI`がデータベースから指定期間の価格データを読み込む
   - データは時系列順にメモリにキャッシュされる

2. **価格の再生**
   - キャッシュされたデータを1件ずつ順に処理
   - 各価格データをデータベースに挿入（バックテストモードであることを示す`source='backtest'`フラグ付き）

3. **取引ボットの実行**
   - 実際の取引ボットと同じロジックで動作
   - 暴落検知、回復検知、注文実行をシミュレート

4. **結果の集計**
   - すべての取引を分析
   - 勝率、総利益、総損失、純利益を計算

## 使い方

### 1. 過去データの準備

バックテストを実行する前に、データベースに過去データを準備する必要があります。

```bash
# 過去7日分のデータを生成してインポート
npm run price-collector -- --historical
```

### 2. バックテストの実行

#### デフォルト（過去7日間）

```bash
npm run backtest
```

#### 特定の期間を指定

```bash
# 2025年10月1日から10月11日までのデータでバックテスト
npm run backtest -- 2025-10-01 2025-10-11
```

### 3. 結果の確認

バックテスト実行後、以下の情報が表示されます：

```
=== Backtest Results ===
Total Trades: 15
Profitable Trades: 9
Losing Trades: 6
Win Rate: 60.00%
Total Profit: $1234.56
Total Loss: $678.90
Net Profit: $555.66

=== Trade Details ===
1. BTC [CLOSED] Entry: $48500.00 | Exit: $49200.00 | P/L: +$700.00 | Strategy: DefaultStrategy
2. ETH [CLOSED] Entry: $2950.00 | Exit: $2890.00 | P/L: -$60.00 | Strategy: DefaultStrategy
...
```

## カスタマイズ

### 戦略の変更

`src/backtest.ts`を編集して、異なる戦略でバックテストを実行できます：

```typescript
import { AggressiveTradingStrategy, ConservativeTradingStrategy } from './strategies/implementations';

// 積極的戦略でテスト
backtest.registerStrategy('BTC', new AggressiveTradingStrategy());

// 保守的戦略でテスト
backtest.registerStrategy('ETH', new ConservativeTradingStrategy());

// カスタム設定でテスト
backtest.registerStrategy('XRP', new DefaultTradingStrategy(15)); // 15%の暴落閾値
```

### 対象通貨の変更

```typescript
const symbols = ['BTC', 'ETH', 'XRP', 'ADA', 'DOT'];
```

### 処理間隔の変更

```typescript
// 1秒間隔で高速処理
await backtest.runBacktest(1000);

// デフォルトは5秒間隔
await backtest.runBacktest();
```

## 主要コンポーネント

### HistoricalPriceAPI

過去の価格データをデータベースから読み込み、順次提供するAPI。

**主要メソッド:**
- `loadHistoricalData(symbol, startTime, endTime)` - データ読み込み
- `getCurrentPrice(symbol)` - 次の価格を取得
- `hasMoreData(symbol)` - データが残っているか確認
- `getProgress(symbol)` - 進捗率を取得

### BacktestService

バックテスト全体を管理するサービス。

**主要メソッド:**
- `registerStrategy(symbol, strategy)` - 戦略を登録
- `runBacktest(intervalMs)` - バックテストを実行
- `getBacktestResults()` - 結果を取得

### BacktestResult

バックテスト結果を格納するインターフェース。

**プロパティ:**
- `totalTrades` - 総取引数
- `profitableTrades` - 利益が出た取引数
- `losingTrades` - 損失が出た取引数
- `winRate` - 勝率（%）
- `totalProfit` - 総利益
- `totalLoss` - 総損失
- `netProfit` - 純利益
- `trades` - 個別の取引詳細

## 実装例

### 複数期間での比較

```typescript
import { BacktestService } from './services/backtest';
import { DefaultTradingStrategy } from './strategies/implementations';

async function compareStrategies() {
  // 2025年10月のデータでテスト
  const backtest1 = new BacktestService(
    new Date('2025-10-01'),
    new Date('2025-10-11')
  );
  backtest1.registerStrategy('BTC', new DefaultTradingStrategy(20));
  const result1 = await backtest1.runBacktest();

  // 9月のデータでテスト
  const backtest2 = new BacktestService(
    new Date('2025-09-01'),
    new Date('2025-09-30')
  );
  backtest2.registerStrategy('BTC', new DefaultTradingStrategy(20));
  const result2 = await backtest2.runBacktest();

  console.log('10月の勝率:', result1.winRate);
  console.log('9月の勝率:', result2.winRate);
}
```

### 戦略の最適化

```typescript
async function optimizeStrategy() {
  const thresholds = [10, 15, 20, 25, 30];
  const results = [];

  for (const threshold of thresholds) {
    const backtest = new BacktestService(
      new Date('2025-10-01'),
      new Date('2025-10-11')
    );
    backtest.registerStrategy('BTC', new DefaultTradingStrategy(threshold));
    const result = await backtest.runBacktest();
    
    results.push({
      threshold,
      winRate: result.winRate,
      netProfit: result.netProfit,
    });
  }

  // 最も良いパフォーマンスの閾値を見つける
  const best = results.reduce((a, b) => 
    a.netProfit > b.netProfit ? a : b
  );
  
  console.log('最適な暴落閾値:', best.threshold);
}
```

## 注意事項

### データ品質

- バックテストの精度は、データベース内の過去データの品質に依存します
- 現在はモックAPIで生成されたデータを使用しています
- 実際の取引所データを使用する場合は、より正確な結果が得られます

### パフォーマンス

- 大量のデータを処理する場合、実行に時間がかかる場合があります
- プログレス表示で進捗を確認できます
- 必要に応じて`intervalMs`を調整してください

### 制限事項

- スリッページ（注文執行価格のずれ）は考慮されていません
- 取引手数料は計算に含まれていません
- 流動性の制約は考慮されていません

## トラブルシューティング

### エラー: No historical data loaded for {symbol}

**原因:** 指定期間のデータがデータベースに存在しない

**解決策:**
```bash
# 過去データをインポート
npm run price-collector -- --historical
```

### バックテストが遅い

**原因:** 大量のデータを処理している

**解決策:**
- より短い期間でテストする
- `intervalMs`を小さくして高速化する（データベースの負荷に注意）

### 取引が検出されない

**原因:** データの期間や戦略の設定が適切でない可能性

**確認事項:**
- データベースに十分なデータが存在するか
- 戦略の閾値が適切か
- 暴落が発生する期間のデータを使用しているか

## まとめ

バックテスト機能を使用することで：

✅ リスクなく戦略をテスト
✅ 過去のデータで戦略の有効性を検証
✅ パラメータを最適化
✅ 複数の戦略を比較

実際の取引を開始する前に、十分なバックテストを行うことをお勧めします。
