# リアルAPI実装ガイド

## 概要

このガイドでは、実際の暗号通貨取引所APIを統合する方法を説明します。システムは`IPriceAPI`インターフェースを使用しており、モックAPIから実APIへの切り替えが簡単に行えます。

## インターフェース構造

### IPriceAPI インターフェース

すべての価格APIは以下のインターフェースを実装する必要があります：

```typescript
// src/interfaces/IPriceAPI.ts
export interface IPriceAPI {
  /**
   * 暗号通貨の現在価格を取得
   * @param symbol - 通貨シンボル (例: 'BTC', 'ETH')
   * @returns Promise<number> - 現在価格
   */
  getCurrentPrice(symbol: string): Promise<number>;

  /**
   * ベース価格を取得（オプション、過去データ生成用）
   * @param symbol - 通貨シンボル
   * @returns number - ベース価格
   */
  getBasePrice?(symbol: string): number;
}
```

## 実装方法

### ステップ1: インターフェースを実装する

`src/api/`ディレクトリに新しいAPIクラスを作成します：

```typescript
import { IPriceAPI } from '../interfaces/IPriceAPI';

export class YourExchangeAPI implements IPriceAPI {
  async getCurrentPrice(symbol: string): Promise<number> {
    // ここにAPI呼び出しを実装
    const response = await fetch(`https://api.example.com/price/${symbol}`);
    const data = await response.json();
    return parseFloat(data.price);
  }

  // オプション: getBasePriceも実装可能
  getBasePrice(symbol: string): number {
    return 1000; // デフォルト値
  }
}
```

### ステップ2: サービスで使用する

実装したAPIをサービスに渡します：

```typescript
import { PriceCollectorService } from './services/priceCollector';
import { BinancePriceAPI } from './api/binancePriceApi';

// リアルAPIを使用
const priceAPI = new BinancePriceAPI();
const priceCollector = new PriceCollectorService(priceAPI);

// 価格収集開始
await priceCollector.startRealTimeCollection(['BTC', 'ETH', 'XRP']);
```

## 提供されている実装例

### Binance API

`src/api/binancePriceApi.ts`にBinanceの実装例があります：

```typescript
import { BinancePriceAPI } from './api/binancePriceApi';

const binanceAPI = new BinancePriceAPI();

// カスタムシンボルマッピングを追加
binanceAPI.addSymbolMapping('ADA', 'ADAUSDT');

// 使用
const priceCollector = new PriceCollectorService(binanceAPI);
```

**特徴:**
- Binance公開APIを使用（認証不要）
- 自動シンボルマッピング（BTC → BTCUSDT）
- エラーハンドリング付き
- Node.js 18+のネイティブfetch使用

## 主要な取引所API統合例

### 1. Binance（実装済み）

```bash
# 追加の依存関係は不要（Node.js 18+のfetch使用）
```

使用方法：
```typescript
import { BinancePriceAPI } from './api/binancePriceApi';
const api = new BinancePriceAPI();
```

### 2. Coinbase

```typescript
import { IPriceAPI } from '../interfaces/IPriceAPI';

export class CoinbasePriceAPI implements IPriceAPI {
  private baseUrl = 'https://api.coinbase.com/v2';

  async getCurrentPrice(symbol: string): Promise<number> {
    const pair = `${symbol}-USD`;
    const response = await fetch(
      `${this.baseUrl}/prices/${pair}/spot`
    );
    const data = await response.json();
    return parseFloat(data.data.amount);
  }
}
```

### 3. CoinGecko

```typescript
import { IPriceAPI } from '../interfaces/IPriceAPI';

export class CoinGeckoPriceAPI implements IPriceAPI {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  
  private idMap: Map<string, string> = new Map([
    ['BTC', 'bitcoin'],
    ['ETH', 'ethereum'],
    ['XRP', 'ripple'],
  ]);

  async getCurrentPrice(symbol: string): Promise<number> {
    const coinId = this.idMap.get(symbol) || symbol.toLowerCase();
    const response = await fetch(
      `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd`
    );
    const data = await response.json();
    return data[coinId].usd;
  }
}
```

## エントリーポイントの変更

### priceCollector.ts

```typescript
import { PriceCollectorService } from './services/priceCollector';
// モックAPIの代わりに実APIをインポート
import { BinancePriceAPI } from './api/binancePriceApi';

async function main() {
  // モックの代わりに実APIを使用
  const priceAPI = new BinancePriceAPI();
  const priceCollector = new PriceCollectorService(priceAPI);
  
  const symbols = ['BTC', 'ETH', 'XRP'];
  await priceCollector.startRealTimeCollection(symbols, 5000);
}
```

## 環境変数での切り替え

環境変数を使ってモック/実APIを切り替える例：

```typescript
import { PriceCollectorService } from './services/priceCollector';
import { MockPriceAPI } from './mocks/priceApi';
import { BinancePriceAPI } from './api/binancePriceApi';
import { IPriceAPI } from './interfaces/IPriceAPI';

function getPriceAPI(): IPriceAPI {
  const apiType = process.env.PRICE_API_TYPE || 'mock';
  
  switch (apiType) {
    case 'binance':
      return new BinancePriceAPI();
    case 'coinbase':
      return new CoinbasePriceAPI();
    case 'mock':
    default:
      return new MockPriceAPI();
  }
}

async function main() {
  const priceAPI = getPriceAPI();
  const priceCollector = new PriceCollectorService(priceAPI);
  // ...
}
```

`.env`ファイル：
```env
# 使用するAPIタイプ: mock, binance, coinbase
PRICE_API_TYPE=binance
```

## レート制限とエラーハンドリング

実APIを使用する際は、レート制限に注意してください：

```typescript
export class BinancePriceAPI implements IPriceAPI {
  private lastCallTime: Map<string, number> = new Map();
  private minInterval = 1000; // 1秒のレート制限

  async getCurrentPrice(symbol: string): Promise<number> {
    // レート制限チェック
    const lastCall = this.lastCallTime.get(symbol) || 0;
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastCall)
      );
    }
    
    try {
      const tradingPair = this.symbolMap.get(symbol) || `${symbol}USDT`;
      const response = await fetch(
        `${this.baseUrl}/api/v3/ticker/price?symbol=${tradingPair}`
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      this.lastCallTime.set(symbol, Date.now());
      return parseFloat(data.price);
    } catch (error) {
      console.error(`Error fetching ${symbol}:`, error);
      // フォールバック処理やリトライロジックを追加
      throw error;
    }
  }
}
```

## テスト

実APIのテストを書く際は、モックを使用することを推奨：

```typescript
import { PriceCollectorService } from '../services/priceCollector';
import { IPriceAPI } from '../interfaces/IPriceAPI';

class TestPriceAPI implements IPriceAPI {
  async getCurrentPrice(symbol: string): Promise<number> {
    return 50000; // テスト用の固定値
  }
}

describe('PriceCollectorService with real API', () => {
  it('should collect prices', async () => {
    const testAPI = new TestPriceAPI();
    const service = new PriceCollectorService(testAPI);
    // テストコード...
  });
});
```

## まとめ

### 必要な実装

リアルAPIを統合するには、以下を実装するだけです：

1. **IPriceAPIインターフェースを実装**
   ```typescript
   export class YourAPI implements IPriceAPI {
     async getCurrentPrice(symbol: string): Promise<number> {
       // API呼び出し
     }
   }
   ```

2. **サービスに渡す**
   ```typescript
   const api = new YourAPI();
   const service = new PriceCollectorService(api);
   ```

### これで万事OK！

- ✅ インターフェース分離済み
- ✅ 既存コードの変更不要
- ✅ 複数API実装の切り替え可能
- ✅ テストが容易
- ✅ 実装例（Binance）提供済み

詳細は以下のファイルを参照：
- `src/interfaces/IPriceAPI.ts` - インターフェース定義
- `src/api/binancePriceApi.ts` - Binance実装例
- `src/mocks/priceApi.ts` - モック実装
