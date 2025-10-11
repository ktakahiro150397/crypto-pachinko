# 過去データ一括登録ガイド

## 概要

過去データの一括登録機能がインターフェースに分離され、CSV、API、モックなど様々なデータソースから効率的にデータをインポートできるようになりました。

## アーキテクチャ

### IHistoricalDataProvider インターフェース

すべての過去データプロバイダーは以下のインターフェースを実装します：

```typescript
export interface IHistoricalDataProvider {
  loadHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<CryptoPrice[]>;
}
```

### 提供されている実装

1. **MockHistoricalDataProvider** - テスト用モックデータ生成
2. **CsvHistoricalDataProvider** - CSVファイルからの読み込み
3. **BinanceHistoricalDataProvider** - Binance APIからの一括取得

## 使用方法

### 1. モックデータ（デフォルト）

テストや開発用の合成データを生成します。

```bash
# デフォルト（モック）で過去30日分をインポート
npm run import-historical

# 特定の通貨のみ
npm run import-historical BTC ETH
```

### 2. CSVファイルから読み込み

CSVファイルを用意して一括登録します。

**CSVフォーマット:**
```csv
timestamp,symbol,price
2025-10-01T00:00:00.000Z,BTC,50000.00
2025-10-01T01:00:00.000Z,BTC,50100.00
2025-10-01T02:00:00.000Z,BTC,49900.00
```

**使用方法:**

```bash
# 環境変数で設定
HISTORICAL_DATA_PROVIDER=csv CSV_DATA_DIRECTORY=./data npm run import-historical

# または.envファイルで設定
```

`.env`:
```env
HISTORICAL_DATA_PROVIDER=csv
CSV_DATA_DIRECTORY=./data
```

**ファイル名の規則:**
- `{SYMBOL}.csv` (例: `BTC.csv`)
- `{SYMBOL}_historical.csv` (例: `btc_historical.csv`)

### 3. Binance APIから一括取得

**重要: APIを「つんつん」しません！**

Binance Klines APIを使用して、一括でヒストリカルデータを取得します：
- 1リクエストで最大1000件のOHLCデータを取得
- バッチ処理で期間全体をカバー
- レート制限を考慮した待機時間（200ms）
- データベースへも1000件ずつバルクインサート

```bash
# Binance APIから過去データを取得
HISTORICAL_DATA_PROVIDER=binance npm run import-historical

# 特定期間（過去7日間）
HISTORICAL_DAYS_BACK=7 HISTORICAL_DATA_PROVIDER=binance npm run import-historical BTC
```

**特徴:**
- ✅ バルクAPI呼び出し（1回で最大1000件）
- ✅ バッチ処理で長期間もカバー
- ✅ レート制限対応
- ✅ データベースへもバルクインサート
- ✅ APIを「つんつん」しない効率的な実装

## カスタムプロバイダーの実装

独自のデータソースを実装できます：

```typescript
import { IHistoricalDataProvider } from '../interfaces/IHistoricalDataProvider';
import { CryptoPrice } from '../types';

export class YourCustomProvider implements IHistoricalDataProvider {
  async loadHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<CryptoPrice[]> {
    // データソースから読み込み
    const prices: CryptoPrice[] = [];
    
    // データ取得ロジック
    // ...
    
    return prices;
  }
}
```

## 実装例

### CSV + Binance のハイブリッド

```typescript
import { PriceCollectorService } from './services/priceCollector';
import { CsvHistoricalDataProvider } from './providers/csvHistoricalDataProvider';
import { BinanceHistoricalDataProvider } from './providers/binanceHistoricalDataProvider';

async function importData() {
  // BTCはCSVから
  const csvProvider = new CsvHistoricalDataProvider('./data');
  const csvCollector = new PriceCollectorService(undefined, csvProvider);
  await csvCollector.insertHistoricalData('BTC', startDate, endDate);

  // ETHはBinanceから
  const binanceProvider = new BinanceHistoricalDataProvider();
  const binanceCollector = new PriceCollectorService(undefined, binanceProvider);
  await binanceCollector.insertHistoricalData('ETH', startDate, endDate);
}
```

## パフォーマンス

### バルクインサート

すべてのプロバイダーからのデータは1000件ずつバッチでデータベースに挿入されます：

```
データ読み込み → バッチ化（1000件） → バルクインサート → 繰り返し
```

### Binance API の効率

```
期間: 30日間（720時間）
従来の方法（1時間ごとにAPI呼び出し）: 720リクエスト ❌
バルク方法（1000件ずつ）: 1リクエスト ✅
```

## 環境変数

```env
# プロバイダーの選択
HISTORICAL_DATA_PROVIDER=mock  # mock, csv, binance

# CSV設定
CSV_DATA_DIRECTORY=./data

# インポート期間（日数）
HISTORICAL_DAYS_BACK=30
```

## トラブルシューティング

### CSVファイルが見つからない

**エラー:** `CSV file not found for symbol BTC`

**解決策:**
1. `data/`ディレクトリにCSVファイルがあることを確認
2. ファイル名が規則に従っているか確認（`BTC.csv`など）
3. `CSV_DATA_DIRECTORY`環境変数が正しいか確認

### Binance APIエラー

**エラー:** `Binance API error: 429`

**原因:** レート制限

**解決策:** スクリプトが自動的にリトライします。しばらく待ってから再実行してください。

### データが重複する

過去データのインポートは冪等ではありません。同じ期間を複数回インポートすると重複します。

**解決策:**
```sql
-- 重複データの削除
DELETE t1 FROM crypto_prices t1
INNER JOIN crypto_prices t2 
WHERE t1.id > t2.id 
AND t1.symbol = t2.symbol 
AND t1.timestamp = t2.timestamp;
```

## まとめ

✅ **インターフェース分離完了**
✅ **CSV対応**
✅ **Binance API一括取得対応**
✅ **バルクインサート実装**
✅ **APIを「つんつん」しない効率的な実装**

簡単な実装で、様々なデータソースから過去データを効率的にインポートできます！
