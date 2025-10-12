# Hyperliquid取引API実装ガイド

このガイドでは、Hyperliquid DEXでの実際の取引を行うための設定方法を説明します。

## 概要

Hyperliquidは分散型取引所（DEX）で、Arbitrumネットワーク上で動作します。このプロジェクトでは、Hyperliquid SDKを使用して実際の取引注文を実行できます。

## 前提条件

1. **Hyperliquidアカウント**: Hyperliquidでアカウントを作成してください
2. **ウォレット**: 取引用のウォレットを準備してください
   - オプション1: 自分のウォレットのプライベートキーを使用
   - オプション2: API Agent専用ウォレットを作成（推奨）
3. **資金**: ウォレットに取引資金を入金してください
   - テストネット: テスト用の資金を取得
   - メインネット: 実際の資金を入金

## セットアップ手順

### ステップ1: 環境変数の設定

`.env`ファイルを作成し、以下の設定を追加します:

```env
# 取引API設定
TRADING_API_TYPE=hyperliquid

# Hyperliquid設定
HYPERLIQUID_PRIVATE_KEY=your_private_key_here
HYPERLIQUID_TESTNET=true
```

#### 設定項目の説明

- **TRADING_API_TYPE**: `hyperliquid`に設定
- **HYPERLIQUID_PRIVATE_KEY**: ウォレットのプライベートキー（必須）
  - ⚠️ **重要**: プライベートキーは絶対に公開しないでください
  - `.env`ファイルは`.gitignore`で除外されています
- **HYPERLIQUID_TESTNET**: テストネット使用フラグ
  - `true`: テストネット（開発・テスト用）
  - `false`: メインネット（本番環境）
- **HYPERLIQUID_WALLET_ADDRESS**: （オプション）API Agentウォレット使用時のメインウォレットアドレス
- **HYPERLIQUID_VAULT_ADDRESS**: （オプション）Vault取引を行う場合のVaultアドレス

### ステップ2: テストネットで動作確認

まずはテストネットで動作確認を行います:

```bash
# 環境変数を設定
export TRADING_API_TYPE=hyperliquid
export HYPERLIQUID_TESTNET=true

# 取引ボットを起動
npm run trading-bot
```

### ステップ3: 本番環境への移行

テストネットで十分にテストした後、本番環境に移行します:

```env
# .envファイルを編集
HYPERLIQUID_TESTNET=false
```

⚠️ **警告**: 本番環境では実際の資金が動きます。十分にテストしてから使用してください。

## 機能説明

### 注文実行

`executeLongOrder(symbol, price, strategy)`メソッドでロング注文を実行します:

```typescript
// 内部的に以下のような処理が行われます
const orderId = await tradingAPI.executeLongOrder('BTC', 50000, 'DefaultStrategy');
```

注文パラメータ:
- **symbol**: 通貨シンボル（BTC、ETH、XRPなど）
- **price**: 注文価格（指値）
- **strategy**: 戦略名（追跡用）

### 注文クローズ

`closeOrder(orderId, exitPrice)`メソッドで特定の注文をクローズします:

```typescript
await tradingAPI.closeOrder(orderId, 55000);
```

### 全注文クローズ

`closeAllOrders()`メソッドで全てのオープンポジションを一括クローズします:

```typescript
await tradingAPI.closeAllOrders();
```

または、TradingBotServiceから:

```typescript
await tradingBot.closeAllOpenOrders();
```

## API Agentウォレットの使用（推奨）

セキュリティを強化するため、API Agent専用ウォレットの使用を推奨します:

1. Hyperliquidで新しいAPI Agentウォレットを作成
2. メインウォレットからAPI Agentに権限を付与
3. API Agentのプライベートキーを`.env`に設定
4. メインウォレットのアドレスも設定

```env
HYPERLIQUID_PRIVATE_KEY=api_agent_wallet_private_key
HYPERLIQUID_WALLET_ADDRESS=main_wallet_address
```

## 注文サイズの調整

デフォルトでは最小注文サイズ（0.01）を使用しています。実際の運用では、`src/api/hyperliquidTradingApi.ts`の以下の部分を編集してください:

```typescript
// 現在の設定
sz: 0.01, // 最小サイズ

// カスタマイズ例
sz: this.calculateOrderSize(symbol, price), // 動的サイズ計算
```

## トラブルシューティング

### エラー: "HYPERLIQUID_PRIVATE_KEY is required"

`.env`ファイルに`HYPERLIQUID_PRIVATE_KEY`が設定されていません。

**解決方法**:
```bash
cp .env.example .env
# .envファイルを編集してプライベートキーを設定
```

### エラー: "Order was not resting"

注文が即座に約定された可能性があります。

**解決方法**:
- 指値価格を調整してください
- 市場の流動性を確認してください

### エラー: "Insufficient balance"

ウォレットの残高が不足しています。

**解決方法**:
- ウォレットに資金を入金してください
- テストネットの場合、テスト資金を取得してください

## セキュリティベストプラクティス

1. **プライベートキーの管理**:
   - `.env`ファイルは絶対にコミットしない
   - 環境変数として設定することを推奨
   - 本番環境では秘密管理サービスの使用を検討

2. **API Agentの使用**:
   - メインウォレットのプライベートキーを直接使用しない
   - API Agent専用ウォレットを作成
   - 必要最小限の権限のみを付与

3. **テストネットでのテスト**:
   - 本番環境に移行する前に必ずテストネットでテスト
   - 全機能が正常に動作することを確認

4. **リスク管理**:
   - 注文サイズを適切に設定
   - ストップロスの実装を検討
   - 定期的なポジションの確認

## 次のステップ

- [README.md](README.md) - プロジェクト全体の概要
- [REAL_API_GUIDE.md](REAL_API_GUIDE.md) - 価格取得APIの実装ガイド
- [Hyperliquid Documentation](https://hyperliquid.gitbook.io/hyperliquid-docs) - 公式ドキュメント

## サポート

問題が発生した場合は、以下を確認してください:
1. エラーログの確認
2. 環境変数の設定確認
3. Hyperliquidの公式ドキュメント
4. GitHubのIssue
