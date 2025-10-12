# Crypto Pachinko

暗号通貨の価格追跡と自動売買システム

## 概要

このプロジェクトは、暗号通貨の価格をデータベースに保存し、価格変動に基づいて自動的に取引注文を実行するシステムです。

### 主な機能

1. **価格データ収集スクリプト** (`src/priceCollector.ts`)
   - リアルタイムでの価格取得と保存
   - 過去データの一括挿入機能
   - 常時実行を想定した設計

2. **自動取引ボット** (`src/tradingBot.ts`)
   - 前日比での暴落検知（デフォルト: 20%以下の下落）
   - リアルタイムでの下落停止（回復）検知
   - 回復検知時のロング注文自動実行
   - 通貨ごとにカスタマイズ可能な取引戦略
   - 常時実行を想定した設計

3. **バックテスト機能** (`src/backtest.ts`) 🆕
   - 過去データを使った取引戦略の検証
   - 特定期間（例：2025-10-11）での動作確認
   - 勝率、損益の詳細分析
   - 複数戦略の比較が可能

## 開発環境

### 必要なツール

- Visual Studio Code
- Docker Desktop
- Dev Containers extension for VSCode

### セットアップ（VSCode DevContainer使用）

1. リポジトリをクローン:
```bash
git clone <repository-url>
cd crypto-pachinko
```

2. VSCodeでプロジェクトを開く:
```bash
code .
```

3. Dev Containerで開く:
   - VSCodeのコマンドパレット（Cmd/Ctrl + Shift + P）を開く
   - "Dev Containers: Reopen in Container" を選択
   - コンテナのビルドと起動を待つ

4. 依存関係のインストール（自動的に実行されますが、必要に応じて手動で実行）:
```bash
npm install
```

5. TypeScriptのビルド:
```bash
npm run build
```

### ローカル環境でのセットアップ（DevContainerなし）

1. 必要なツール:
   - Node.js 20以上
   - Docker Desktop

2. MySQLコンテナを起動:
```bash
docker-compose up -d
```

3. 依存関係のインストール:
```bash
npm install
```

4. 環境変数の設定:
```bash
cp .env.example .env
```

5. TypeScriptのビルド:
```bash
npm run build
```

## アーキテクチャ

### データベーススキーマ

**crypto_prices** - 価格データテーブル
- `id`: プライマリキー
- `symbol`: 通貨シンボル（BTC, ETH, など）
- `price`: 価格
- `timestamp`: タイムスタンプ
- `source`: データソース

**trading_orders** - 取引注文テーブル
- `id`: プライマリキー
- `symbol`: 通貨シンボル
- `order_type`: 注文タイプ（LONG, SHORT）
- `entry_price`: エントリー価格
- `entry_timestamp`: エントリータイムスタンプ
- `exit_price`: 決済価格
- `exit_timestamp`: 決済タイムスタンプ
- `status`: ステータス（OPEN, CLOSED, CANCELLED）
- `strategy`: 使用した戦略名
- `profit_loss`: 損益

**crash_events** - 暴落イベントテーブル
- `id`: プライマリキー
- `symbol`: 通貨シンボル
- `detected_timestamp`: 検知タイムスタンプ
- `previous_day_price`: 前日価格
- `current_price`: 現在価格
- `drop_percentage`: 下落率

### コンポーネント構成

```
src/
├── database/           # データベース接続とリポジトリ
│   ├── connection.ts   # データベース接続管理
│   └── repositories.ts # データアクセス層
├── strategies/         # 取引戦略
│   ├── interfaces.ts   # 戦略インターフェース
│   └── implementations.ts # 戦略実装
├── services/           # ビジネスロジック
│   ├── priceCollector.ts # 価格収集サービス
│   └── tradingBot.ts     # 取引ボットサービス
├── mocks/              # モックAPI
│   ├── priceApi.ts     # 価格APIモック
│   └── tradingApi.ts   # 取引APIモック
├── types/              # 型定義
│   └── index.ts
├── priceCollector.ts   # 価格収集スクリプト（エントリーポイント）
├── tradingBot.ts       # 取引ボットスクリプト（エントリーポイント）
└── index.ts            # メインエントリーポイント
```

## 使用方法

### データベース接続テスト

```bash
npm start
```

### 価格収集スクリプトの実行

リアルタイム価格収集:
```bash
npm run price-collector
```

過去データを含めて実行:
```bash
npm run price-collector -- --historical
```

### 取引ボットの実行

```bash
npm run trading-bot
```

### バックテストの実行

過去データを使って取引戦略をテストできます:

```bash
# デフォルト（過去7日間）
npm run backtest

# 特定の期間を指定
npm run backtest -- 2025-10-01 2025-10-11
```

**バックテストの流れ:**
1. データベースから指定期間の過去価格データを読み込み
2. 時系列順に価格を再生
3. 取引ボットが実際の動作をシミュレート
4. 結果（取引回数、勝率、損益）を表示

**注意:** バックテストを実行する前に、`npm run price-collector -- --historical` で過去データをインポートしておく必要があります。

### 両方を同時に実行（推奨）

ターミナルを2つ開いて:

ターミナル1（価格収集）:
```bash
npm run price-collector
```

ターミナル2（取引ボット）:
```bash
npm run trading-bot
```

## 取引戦略のカスタマイズ

プロジェクトには拡張可能な戦略システムが実装されています。

### 組み込み戦略

1. **DefaultTradingStrategy** - デフォルト戦略
   - 暴落閾値: 20%
   - 回復検知: 3回連続の価格上昇

2. **AggressiveTradingStrategy** - 積極的戦略
   - 暴落閾値: 10%
   - 回復検知: 2回連続の価格上昇

3. **ConservativeTradingStrategy** - 保守的戦略
   - 暴落閾値: 30%
   - 回復検知: 5回連続の価格上昇

### カスタム戦略の作成

`src/strategies/implementations.ts` に新しい戦略を追加できます:

```typescript
export class CustomStrategy implements ITradingStrategy {
  public crashDetection: ICrashDetectionStrategy;
  public recoveryDetection: IRecoveryDetectionStrategy;

  constructor() {
    this.crashDetection = new PercentageDropCrashDetection(15);
    this.recoveryDetection = new ConsecutiveIncreaseRecoveryDetection(4);
  }

  getStrategyName(): string {
    return 'CustomStrategy';
  }
}
```

戦略を通貨に適用:

```typescript
// src/tradingBot.ts
tradingBot.registerStrategy('BTC', new CustomStrategy());
```

## 設定

環境変数は `.env` ファイルで設定できます（`.env.example` を参照）:

```env
# データベース設定
DB_HOST=mysql
DB_PORT=3306
DB_USER=crypto_user
DB_PASSWORD=crypto_pass
DB_NAME=crypto_pachinko

# 価格API設定
PRICE_API_TYPE=mock  # mock, binance

# 取引API設定
TRADING_API_TYPE=mock  # mock, hyperliquid

# Hyperliquid設定（TRADING_API_TYPE=hyperliquidの場合に必要）
HYPERLIQUID_PRIVATE_KEY=  # プライベートキー（必須）
HYPERLIQUID_TESTNET=true  # テストネット使用
HYPERLIQUID_WALLET_ADDRESS=  # API Agentウォレット使用時のみ
HYPERLIQUID_VAULT_ADDRESS=   # Vault取引時のみ

# 価格収集設定
PRICE_COLLECTION_INTERVAL_MS=5000

# 取引ボット設定
CRASH_THRESHOLD_PERCENTAGE=20
RECOVERY_CHECK_INTERVAL_MS=10000
```

## クイックスタートガイド

### シナリオ1: リアルタイム取引システム

```bash
# ターミナル1: 価格収集を開始
npm run price-collector

# ターミナル2: 取引ボットを開始
npm run trading-bot
```

### シナリオ2: バックテストで戦略を検証

```bash
# ステップ1: 過去データを準備
npm run price-collector -- --historical

# ステップ2: 特定期間でバックテスト
npm run backtest -- 2025-10-01 2025-10-11

# 結果を確認して戦略を調整
```

詳細は `BACKTEST_EXAMPLE.md` と `BACKTEST_GUIDE.md` を参照してください。

## 開発

### ビルド

```bash
npm run build
```

### リント

```bash
npm run lint
```

### フォーマット

```bash
npm run format
```

### テスト

```bash
npm test
```

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js 20
- **データベース**: MySQL 8.0
- **開発環境**: DevContainer (Docker)
- **パッケージマネージャ**: npm

## モックAPI

### 価格取得API

現在、価格取得APIはモックと実装例が提供されています:

- **MockPriceAPI**: ランダムな価格変動をシミュレート（テスト用）
- **BinancePriceAPI**: Binance公開APIの実装例

環境変数 `PRICE_API_TYPE` で切り替え可能（`mock`、`binance`）。

### 取引API

取引APIはモックとHyperliquid DEXの実装が提供されています:

- **MockTradingAPI**: 注文の記録と管理をシミュレート（テスト用）
- **HyperliquidTradingAPI**: Hyperliquid DEXでの実際の取引を実行

環境変数 `TRADING_API_TYPE` で切り替え可能（`mock`、`hyperliquid`）。

#### Hyperliquid取引APIの使用方法

1. **.envファイルを設定**:
```env
# 取引API設定
TRADING_API_TYPE=hyperliquid

# Hyperliquid設定
HYPERLIQUID_PRIVATE_KEY=your_private_key_here
HYPERLIQUID_TESTNET=true  # テストネット使用（本番環境ではfalse）
HYPERLIQUID_WALLET_ADDRESS=  # API Agentウォレット使用時のみ必要
HYPERLIQUID_VAULT_ADDRESS=   # Vault取引時のみ必要
```

2. **取引ボットを起動**:
```bash
npm run trading-bot
```

3. **注意事項**:
   - プライベートキーは絶対に`.env.example`にコミットしないでください
   - `.gitignore`で`.env`は除外されています
   - テストネットで十分にテストしてから本番環境を使用してください
   - HyperliquidはDEXのため、API用に作成したウォレットで取引を行います

#### 全注文クローズ機能

すべての取引API実装は`closeAllOrders()`メソッドをサポートしており、すべてのオープンポジションを一括でクローズできます。

詳細は `REAL_API_GUIDE.md` を参照してください。

## ライセンス

MIT
