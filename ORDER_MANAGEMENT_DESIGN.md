# Hyperliquid注文管理の設計

## 問題の背景

Hyperliquid DEXで取引を行う際、以下のような問題が発生する可能性がありました：

### 修正前の問題点

1. **ローカル状態のみに依存**
   - `orderIdMap`というローカルのMapで注文IDを管理
   - プログラムが再起動すると、この情報が失われる

2. **注文クローズ漏れのリスク**
   - ローカル状態とHyperliquid側の実際の注文が不一致になる可能性
   - 外部から注文がキャンセルされた場合、ローカルで追跡できない
   - プログラム異常終了時に注文が残る可能性

3. **同期の問題**
   - Hyperliquidの実際の状態を確認する手段がない
   - 「注文クローズ漏れありました〜」という最悪のシナリオが発生しうる

## 解決策

### 1. Hyperliquid APIを直接利用

```typescript
async closeAllOrders(): Promise<void> {
  // ステップ1: Hyperliquidから実際の注文を取得
  const walletAddr = this.walletAddress || (await this.getWalletAddressFromClient());
  const openOrders = await this.client.info.getUserOpenOrders(walletAddr);
  
  console.log(`Found ${openOrders.length} open orders on Hyperliquid`);
  
  // ステップ2: Hyperliquid側で全注文をアトミックにクローズ
  await this.client.exchange.cancelAllOrders();
  
  // ステップ3: ローカル状態もクリア
  this.orderIdMap.clear();
}
```

### 2. 実際の注文を取得するメソッドを追加

```typescript
async getActualOpenOrders(): Promise<unknown[]> {
  const walletAddr = this.walletAddress || (await this.getWalletAddressFromClient());
  const openOrders = await this.client.info.getUserOpenOrders(walletAddr);
  return openOrders;
}
```

このメソッドで、いつでもHyperliquidの実際の注文状態を確認できます。

### 3. 注文クローズの保証

**重要なポイント：**

✅ **ローカル状態に依存しない**
- `closeAllOrders()`は常にHyperliquid APIを呼び出す
- ローカルの`orderIdMap`が空でも、Hyperliquid側の注文は確実にクローズ

✅ **アトミック操作**
- `cancelAllOrders()`はHyperliquid側で全注文を一度にキャンセル
- 部分的な失敗がない

✅ **状態の同期**
- 必要に応じて`getActualOpenOrders()`で実際の状態を確認可能
- プログラム再起動後でも問題なし

## 使用例

### 通常の使用

```typescript
// 注文を作成
const orderId = await tradingAPI.executeLongOrder('BTC', 50000, 'Strategy1');

// 全注文をクローズ（ローカル状態に関係なく、Hyperliquid側の全注文が確実にクローズされる）
await tradingAPI.closeAllOrders();
```

### 状態確認

```typescript
// Hyperliquidの実際の注文を確認
const actualOrders = await tradingAPI.getActualOpenOrders();
console.log(`実際の注文数: ${actualOrders.length}`);

// 必要に応じて全注文をクローズ
if (actualOrders.length > 0) {
  await tradingAPI.closeAllOrders();
}
```

## まとめ

**修正前：**
- ❌ ローカル状態のみに依存
- ❌ 注文クローズ漏れのリスク
- ❌ 再起動時の問題

**修正後：**
- ✅ Hyperliquid APIから直接注文を取得
- ✅ 注文クローズ漏れを防止
- ✅ プログラム再起動後も安全
- ✅ 外部からの変更にも対応

この設計により、「注文クローズ漏れありました〜は絶対だめ」という要件を満たしています。
